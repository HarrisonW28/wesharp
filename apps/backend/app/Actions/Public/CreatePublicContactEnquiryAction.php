<?php

namespace App\Actions\Public;

use App\Enums\NoteVisibility;
use App\Models\Company;
use App\Models\Contact;
use App\Services\Audit\AuditRecorder;
use App\Services\Crm\CompanyLeadResolver;
use App\Services\Notifications\NotificationService;
use App\Support\Portal\CustomerPortalUrls;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CreatePublicContactEnquiryAction
{
    public function __construct(
        private readonly CompanyLeadResolver $leadResolver,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * @param  array<string, mixed>  $validated
     * @return array{accepted: bool, message: string}
     */
    public function execute(array $validated, Request $request): array
    {
        $emailNorm = Str::lower(trim((string) $validated['email']));
        $businessName = isset($validated['business_name']) && is_string($validated['business_name']) && trim($validated['business_name']) !== ''
            ? trim($validated['business_name'])
            : trim((string) $validated['contact_name']);
        $topic = isset($validated['topic']) ? (string) $validated['topic'] : 'general';

        $company = null;

        DB::transaction(function () use ($validated, $request, $emailNorm, $businessName, $topic, &$company): void {
            $company = $this->leadResolver->resolveOrCreateLead([
                'name' => $businessName,
                'email' => $emailNorm,
                'phone' => isset($validated['phone']) ? (string) $validated['phone'] : null,
            ]);

            $this->ensureContact($company, $validated);

            $company->notes()->create([
                'author_id' => null,
                'body' => 'Contact form enquiry ('.$topic.'): '.trim((string) $validated['message']),
                'visibility' => NoteVisibility::Internal,
            ]);

            AuditRecorder::record(null, $company, 'public.contact_enquiry', [
                'topic' => $topic,
                'email_domain' => Str::after($emailNorm, '@') ?: '-',
            ], $request);
        });

        $registerUrl = CustomerPortalUrls::base().'/register?returnTo='.rawurlencode('/account/dashboard');
        $this->notifications->queueEmail(
            type: 'contact.enquiry.received',
            idempotencyKey: 'contact.enquiry.received:'.sha1($emailNorm.'|'.Str::substr(trim((string) $validated['message']), 0, 120)),
            subject: 'We’ve received your message',
            view: 'emails.notifications.generic',
            viewData: [
                'headline' => 'Thanks for getting in touch',
                'body' => "We've received your message and will reply shortly.\n\nYou can also create a free WeSharp account with this email to book collections and manage subscriptions online.",
                'ctaUrl' => $registerUrl,
                'ctaLabel' => 'Create account',
            ],
            ctx: [
                'company_id' => $company instanceof Company ? (string) $company->id : '',
                'recipient_email' => $emailNorm,
                'recipient_name' => trim((string) $validated['contact_name']),
            ],
        );

        return [
            'accepted' => true,
            'message' => 'Thank you — we have received your message and will respond shortly.',
        ];
    }

    /** @param  array<string, mixed>  $validated */
    private function ensureContact(Company $company, array $validated): Contact
    {
        $compact = preg_replace('/\s+/', ' ', trim((string) $validated['contact_name']));
        $compact = $compact ?? '';
        $parts = explode(' ', $compact, 2);
        $first = $parts[0] !== '' ? $parts[0] : '-';
        $last = $parts[1] ?? $parts[0];

        /** @phpstan-ignore-next-line */
        return Contact::query()->updateOrCreate(
            [
                'company_id' => $company->id,
                'email' => Str::lower(trim((string) $validated['email'])),
            ],
            [
                'first_name' => $first,
                'last_name' => $last !== '' ? $last : '-',
                'phone' => isset($validated['phone']) ? (string) $validated['phone'] : null,
                'billing_contact' => true,
            ]
        );
    }
}
