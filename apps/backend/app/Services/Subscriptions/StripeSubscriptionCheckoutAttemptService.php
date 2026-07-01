<?php

declare(strict_types=1);

namespace App\Services\Subscriptions;

use App\Enums\StripeCheckoutAttemptStatus;
use App\Models\Company;
use App\Models\StripeSubscriptionCheckoutAttempt;
use App\Models\SubscriptionPlan;
use App\Services\Notifications\NotificationService;
use App\Support\Portal\CustomerPortalUrls;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

final class StripeSubscriptionCheckoutAttemptService
{
    public function __construct(
        private readonly NotificationService $notifications,
    ) {}

    public function recordPendingForSession(
        Company $company,
        SubscriptionPlan $plan,
        string $checkoutSessionId,
        ?int $expiresAtUnix,
        ?string $customerEmail,
    ): void {
        if ($checkoutSessionId === '') {
            return;
        }

        $existing = StripeSubscriptionCheckoutAttempt::query()
            ->where('stripe_checkout_session_id', $checkoutSessionId)
            ->first();
        if ($existing !== null && $existing->status === StripeCheckoutAttemptStatus::Completed) {
            return;
        }

        StripeSubscriptionCheckoutAttempt::query()->updateOrCreate(
            ['stripe_checkout_session_id' => $checkoutSessionId],
            [
                'company_id' => $company->id,
                'subscription_plan_id' => $plan->id,
                'status' => StripeCheckoutAttemptStatus::Pending,
                'amount_pence' => max(1, (int) $plan->price_amount_minor),
                'currency' => $plan->currency ?? 'GBP',
                'customer_email' => $customerEmail !== null && $customerEmail !== '' ? $customerEmail : null,
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

        StripeSubscriptionCheckoutAttempt::query()
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

        $attempt = StripeSubscriptionCheckoutAttempt::query()
            ->where('stripe_checkout_session_id', $checkoutSessionId)
            ->where('status', StripeCheckoutAttemptStatus::Pending)
            ->lockForUpdate()
            ->first();

        if ($attempt === null) {
            Log::notice('stripe.webhook.subscription.checkout.session.expired_no_pending_attempt', [
                'checkout_session_id' => $checkoutSessionId,
            ]);

            return;
        }

        $attempt->status = StripeCheckoutAttemptStatus::Expired;
        $attempt->expired_at = now();
        $attempt->save();

        if ($attempt->follow_up_dispatched_at !== null) {
            return;
        }

        $this->dispatchFollowUp($attempt);
        $attempt->follow_up_dispatched_at = now();
        $attempt->save();
    }

    private function dispatchFollowUp(StripeSubscriptionCheckoutAttempt $attempt): void
    {
        $attempt->loadMissing(['plan:id,name', 'company:id,name']);
        $email = $attempt->customer_email;
        if (! is_string($email) || trim($email) === '') {
            return;
        }

        $planName = $attempt->plan?->name ?? 'your programme';
        $subscribeUrl = CustomerPortalUrls::base().'/subscribe/'.(string) $attempt->subscription_plan_id;

        $this->notifications->queueEmail(
            type: 'subscription.checkout.abandoned_reminder',
            idempotencyKey: 'subscription.checkout.abandoned_reminder:'.(string) $attempt->id,
            subject: 'Finish subscribing to '.$planName,
            view: 'emails.notifications.generic',
            viewData: [
                'headline' => 'Your subscription checkout wasn’t completed',
                'body' => 'You started signing up for '.$planName." but didn’t finish payment. If you still want to subscribe, pick up where you left off — it only takes a minute.",
                'ctaUrl' => $subscribeUrl,
                'ctaLabel' => 'Complete subscription',
            ],
            ctx: [
                'company_id' => (string) $attempt->company_id,
                'recipient_email' => mb_strtolower(trim($email)),
                'source_type' => StripeSubscriptionCheckoutAttempt::class,
                'source_id' => (string) $attempt->id,
            ],
        );
    }
}
