<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Enums\StripeCheckoutAttemptStatus;
use App\Models\Invoice;
use App\Models\StripeCheckoutAttempt;
use App\Services\Notifications\InAppNotificationDispatcher;
use App\Services\Notifications\NotificationService;
use App\Support\Portal\CustomerPortalUrls;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Persists invoice Checkout (mode=payment) sessions for abandonment tracking (e.g. checkout.session.expired).
 */
final class StripeInvoiceCheckoutAttemptService
{
    public function __construct(
        private readonly InAppNotificationDispatcher $inAppNotifications,
        private readonly NotificationService $notifications,
    ) {}

    public function recordPendingForSession(
        Invoice $invoice,
        string $checkoutSessionId,
        int $amountPenceOutstanding,
        ?int $expiresAtUnix,
        ?string $customerEmail,
        bool $marketingOptIn = false,
    ): void {
        if ($checkoutSessionId === '') {
            return;
        }

        $existing = StripeCheckoutAttempt::query()
            ->where('stripe_checkout_session_id', $checkoutSessionId)
            ->first();
        if ($existing !== null && $existing->status === StripeCheckoutAttemptStatus::Completed) {
            return;
        }

        StripeCheckoutAttempt::query()->updateOrCreate(
            ['stripe_checkout_session_id' => $checkoutSessionId],
            [
                'invoice_id' => $invoice->id,
                'order_id' => $invoice->order_id,
                'company_id' => $invoice->company_id,
                'status' => StripeCheckoutAttemptStatus::Pending,
                'amount_pence' => max(1, $amountPenceOutstanding),
                'currency' => $invoice->currency ?? 'GBP',
                'customer_email' => $customerEmail !== null && $customerEmail !== '' ? $customerEmail : null,
                'marketing_opt_in' => $marketingOptIn,
                'expires_at' => $expiresAtUnix !== null && $expiresAtUnix > 0
                    ? Carbon::createFromTimestamp($expiresAtUnix)
                    : null,
                'completed_at' => null,
                'expired_at' => null,
            ],
        );
    }

    public function markCompleted(string $checkoutSessionId): void
    {
        if ($checkoutSessionId === '') {
            return;
        }

        StripeCheckoutAttempt::query()
            ->where('stripe_checkout_session_id', $checkoutSessionId)
            ->where('status', StripeCheckoutAttemptStatus::Pending)
            ->update([
                'status' => StripeCheckoutAttemptStatus::Completed,
                'completed_at' => now(),
            ]);
    }

    public function markExpired(string $checkoutSessionId): void
    {
        if ($checkoutSessionId === '') {
            return;
        }

        /** No nested {@see \Illuminate\Support\Facades\DB::transaction()} — webhook controller already wraps handlers; SQLite rejects nested transactions. */
        $attempt = StripeCheckoutAttempt::query()
            ->where('stripe_checkout_session_id', $checkoutSessionId)
            ->where('status', StripeCheckoutAttemptStatus::Pending)
            ->lockForUpdate()
            ->first();

        if ($attempt === null) {
            Log::notice('stripe.webhook.checkout.session.expired_no_pending_attempt', [
                'checkout_session_id' => $checkoutSessionId,
            ]);

            return;
        }

        $attempt->status = StripeCheckoutAttemptStatus::Expired;
        $attempt->expired_at = now();
        $attempt->save();

        if ($attempt->marketing_opt_in !== true) {
            return;
        }

        if ($attempt->sales_follow_up_dispatched_at !== null) {
            return;
        }

        $this->dispatchSalesFollowUp($attempt);

        $attempt->sales_follow_up_dispatched_at = now();
        $attempt->save();
    }

    private function dispatchSalesFollowUp(StripeCheckoutAttempt $attempt): void
    {
        $attempt->loadMissing('invoice.company:id,name');
        $invoice = $attempt->invoice;
        if ($invoice === null) {
            return;
        }

        $this->inAppNotifications->notifyStaffInvoiceCheckoutAbandoned($attempt, $invoice);

        $email = $attempt->customer_email;
        if (! is_string($email) || trim($email) === '') {
            return;
        }

        $companyId = $attempt->company_id !== null ? (string) $attempt->company_id : null;
        if ($companyId === null || $companyId === '') {
            return;
        }

        $invoiceUrl = CustomerPortalUrls::base().'/account/invoices/'.$invoice->id;
        $ref = $invoice->invoice_number !== null && $invoice->invoice_number !== ''
            ? $invoice->invoice_number
            : 'your invoice';

        $this->notifications->queueEmail(
            type: 'invoice.checkout.abandoned_reminder',
            idempotencyKey: 'invoice.checkout.abandoned_reminder:'.(string) $attempt->id,
            subject: 'Reminder: complete payment for '.$ref,
            view: 'emails.notifications.generic',
            viewData: [
                'headline' => 'Your payment wasn’t completed',
                'body' => 'We noticed you started paying '.$ref." but didn’t finish. If you still mean to pay, open the invoice in your account and try again.",
                'ctaUrl' => $invoiceUrl,
                'ctaLabel' => 'View invoice',
            ],
            ctx: [
                'company_id' => $companyId,
                'recipient_email' => mb_strtolower(trim($email)),
                'source_type' => StripeCheckoutAttempt::class,
                'source_id' => (string) $attempt->id,
            ],
        );
    }
}
