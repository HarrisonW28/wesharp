<?php

namespace App\Actions\Public;

use App\Enums\BookingStatus;
use App\Enums\CompanyStatus;
use App\Enums\NoteVisibility;
use App\Enums\ServiceType;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\Contact;
use App\Models\SubscriptionPlan;
use App\Services\Audit\AuditRecorder;
use App\Services\Crm\CompanyLeadResolver;
use App\Services\Notifications\BookingEmailService;
use App\Services\Notifications\InAppNotificationDispatcher;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CreatePublicBookingEnquiryAction
{
    public function __construct(
        private readonly BookingEmailService $bookingEmails,
        private readonly InAppNotificationDispatcher $inAppNotifications,
        private readonly CompanyLeadResolver $leadResolver,
    ) {}

    /**
     * @param  array<string, mixed>  $validated  Output of StorePublicBookingEnquiryRequest validation
     * @return array{accepted: bool, message: string}
     */
    public function execute(array $validated, Request $request): array
    {
        $emailNorm = Str::lower(trim((string) $validated['email']));

        $booking = null;

        DB::transaction(function () use ($validated, $request, $emailNorm, &$booking): void {
            $company = $this->resolveOrCreateCompany($validated, $emailNorm);

            $location = $this->ensureLocation($company, $validated);

            $contact = $this->ensureContact($company, $validated);

            $customerNotes = $this->buildCustomerNotes($validated);

            /** @phpstan-ignore-next-line */
            $booking = Booking::query()->create([
                'company_id' => $company->id,
                'company_location_id' => $location->id,
                'contact_id' => $contact->id,
                'booking_status' => BookingStatus::Requested,
                'service_type' => $validated['service_type'] instanceof ServiceType
                    ? $validated['service_type']
                    : ServiceType::from((string) $validated['service_type']),
                'scheduled_date' => Carbon::parse((string) $validated['preferred_date'])->timezone('UTC')->startOfDay(),
                'time_window_start' => null,
                'time_window_end' => null,
                'estimated_knife_count' => isset($validated['estimated_knife_count'])
                    ? (int) $validated['estimated_knife_count']
                    : null,
                'customer_notes' => $customerNotes,
                'internal_notes' => <<<'TXT'
Captured from anonymous public enquiry (website booking form).
Qualify commercially and confirm pickup address/details before assigning a route or confirming SLA.
TXT,
                'price_estimate_pence' => isset($validated['price_guide_estimate_pence'])
                    ? (int) $validated['price_guide_estimate_pence']
                    : null,
            ]);

            $company->notes()->create([
                'author_id' => null,
                'body' => 'Inbound lead: booking enquiry submitted from the WeSharp public website. Review CRM profile and qualifying notes on the booking.',
                'visibility' => NoteVisibility::Internal,
            ]);

            AuditRecorder::record(null, $company, 'public.booking_enquiry', [
                'email_domain' => Str::after($emailNorm, '@') ?: '-',
                'preferred_date' => (string) $validated['preferred_date'],
            ], $request);

            AuditRecorder::record(null, $booking, 'booking.created_from_public_enquiry', [], $request);
        });

        if ($booking instanceof Booking) {
            $booking->load(['company:id,name,city', 'location:id,city,line_one', 'contact']);
            $this->bookingEmails->sendBookingRequested($booking);
            $this->bookingEmails->sendBookingEnquiryAccountInvite($booking);
            $this->inAppNotifications->notifyStaffNewBooking($booking);
        }

        return [
            'accepted' => true,
            'message' => 'Thank you — we have received your enquiry and will respond shortly.',
        ];
    }

    private function resolveOrCreateCompany(array $validated, string $emailNorm): Company
    {
        $existing = $this->leadResolver->findByEmail($emailNorm);
        if ($existing instanceof Company) {
            return $existing;
        }

        /** @phpstan-ignore-next-line */
        return Company::query()->create([
            'name' => (string) $validated['business_name'],
            'slug' => $this->uniqueSlug($this->slugBase((string) $validated['business_name'])),
            'company_status' => CompanyStatus::Lead,
            'phone' => (string) $validated['phone'],
            'billing_email' => (string) $validated['email'],
            'city' => (string) $validated['city'],
        ]);
    }

    /** @param  array<string, mixed>  $validated */
    private function ensureLocation(Company $company, array $validated): CompanyLocation
    {
        /** @phpstan-ignore-next-line */
        return CompanyLocation::query()->create([
            'company_id' => $company->id,
            'label' => 'Public enquiry — '.Carbon::parse((string) $validated['preferred_date'])->timezone('UTC')->format('Y-m-d'),
            'line_one' => (string) $validated['address_line_1'],
            'line_two' => isset($validated['address_line_2']) && is_string($validated['address_line_2'])
                ? (string) $validated['address_line_2']
                : null,
            'city' => (string) $validated['city'],
            'postcode' => (string) $validated['postcode'],
            'country' => 'GB',
        ]);
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
                'phone' => (string) $validated['phone'],
                'billing_contact' => false,
            ]
        );
    }

    /** @param  array<string, mixed>  $validated */
    private function buildCustomerNotes(array $validated): string
    {
        $lines = [
            trim((string) $validated['message']),
            '',
            'Preferred time window: '.trim((string) $validated['time_window_preference']),
        ];

        if (isset($validated['estimated_knife_count'])) {
            $lines[] = 'Estimated knives: '.$validated['estimated_knife_count'];
        }

        $interest = isset($validated['programme_interest']) ? (string) $validated['programme_interest'] : '';
        if ($interest !== '') {
            $label = match ($interest) {
                'one_off' => 'One-off visit',
                'subscription' => 'Ongoing programme / subscription',
                'unsure' => 'Not sure — please advise',
                default => $interest,
            };
            $lines[] = 'Programme preference: '.$label;
        }

        $planId = isset($validated['subscription_plan_id']) ? (string) $validated['subscription_plan_id'] : '';
        if ($planId !== '') {
            /** @phpstan-ignore-next-line */
            $plan = SubscriptionPlan::query()->find($planId);
            $lines[] = $plan instanceof SubscriptionPlan
                ? 'Subscription plan interest: '.$plan->name.' (catalogue id '.$plan->id.')'
                : 'Subscription plan interest (catalogue id '.$planId.')';
        }

        $lines[] = '[Source: wesharp.app public booking form]';

        return implode("\n", $lines);
    }

    private function slugBase(string $name): string
    {
        return Str::slug(Str::substr($name, 0, 100).'-'.Str::lower(Str::random(6)), '-');
    }

    private function uniqueSlug(string $slug): string
    {
        /** @phpstan-ignore-next-line */
        $candidate = Str::substr($slug, 0, 248);
        $base = $candidate;
        $i = 2;
        /** @phpstan-ignore-next-line */
        while (Company::query()->where('slug', $candidate)->exists()) {
            $candidate = Str::substr($base, 0, 230).'--'.$i++;
        }

        return $candidate;
    }
}
