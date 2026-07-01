<?php

declare(strict_types=1);

namespace App\Support\Stripe;

use App\Enums\CompanyStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\SubscriptionPlan;
use App\Services\Notifications\SubscriptionEmailService;
use App\Services\Stripe\StripeSubscriptionRetrieveClient;
use App\Services\Subscriptions\CompanySubscriptionProvisioningService;
use App\Services\Subscriptions\StripeSubscriptionCheckoutAttemptService;
use App\Services\Subscriptions\SubscriptionBillingPeriodService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Stripe\Subscription;
use Throwable;

/**
 * Subscription Checkout + Stripe subscription lifecycle (Laravel remains allowance / usage source of truth).
 */
final class StripeWebhookSubscriptionProcessor
{
    public function __construct(
        private readonly CompanySubscriptionProvisioningService $provisioning,
        private readonly StripeSubscriptionRetrieveClient $stripeSubscriptions,
        private readonly SubscriptionBillingPeriodService $billingPeriods,
        private readonly SubscriptionEmailService $subscriptionEmails,
        private readonly StripeSubscriptionCheckoutAttemptService $checkoutAttempts,
    ) {}

    /** @param  array<string, mixed>  $event */
    public function process(array $event): void
    {
        $type = isset($event['type']) && is_string($event['type']) ? $event['type'] : '';
        $object = $event['data']['object'] ?? null;
        if (! is_array($object)) {
            return;
        }

        match ($type) {
            'checkout.session.completed' => $this->onCheckoutSessionCompleted($object),
            'checkout.session.expired' => $this->onCheckoutSessionExpired($object),
            'customer.subscription.created',
            'customer.subscription.updated' => $this->onCustomerSubscriptionUpdated($object),
            'customer.subscription.deleted' => $this->onCustomerSubscriptionDeleted($object),
            'invoice.paid' => $this->onInvoicePaid($object),
            'invoice.payment_failed' => $this->onInvoicePaymentFailed($object),
            default => null,
        };
    }

    /**
     * @param  array<string, mixed>  $obj
     */
    private function onCheckoutSessionCompleted(array $obj): void
    {
        if (($obj['mode'] ?? '') !== 'subscription') {
            return;
        }

        if (($obj['payment_status'] ?? '') !== 'paid' && ($obj['payment_status'] ?? '') !== 'no_payment_required') {
            return;
        }

        $stripeSubId = $obj['subscription'] ?? null;
        if (! is_string($stripeSubId) || $stripeSubId === '') {
            return;
        }

        $customerId = $obj['customer'] ?? null;
        if (! is_string($customerId) || $customerId === '') {
            Log::notice('stripe.subscription.checkout_missing_customer', ['subscription_id' => $stripeSubId]);

            return;
        }

        $metadataRaw = $obj['metadata'] ?? [];
        $metadata = is_array($metadataRaw) ? $metadataRaw : [];
        $companyId = isset($metadata['company_id']) && is_string($metadata['company_id']) ? $metadata['company_id'] : null;
        $planId = isset($metadata['subscription_plan_id']) && is_string($metadata['subscription_plan_id'])
            ? $metadata['subscription_plan_id']
            : null;

        if ($companyId === null || $planId === null) {
            Log::notice('stripe.subscription.checkout_missing_metadata', [
                'subscription_id' => $stripeSubId,
                'company_id' => $companyId,
                'plan_id' => $planId,
            ]);

            return;
        }

        try {
            $sessionId = isset($obj['id']) && is_string($obj['id']) ? $obj['id'] : '';
            $this->activateFromStripeCheckout($companyId, $planId, $customerId, $stripeSubId, $sessionId);
        } catch (Throwable $e) {
            Log::error('stripe.subscription.checkout_activate_failed', [
                'subscription_id' => $stripeSubId,
                'company_id' => $companyId,
                'plan_id' => $planId,
                'message' => $e->getMessage(),
            ]);
        }
    }

    private function activateFromStripeCheckout(
        string $companyId,
        string $planId,
        string $stripeCustomerId,
        string $stripeSubscriptionId,
        string $checkoutSessionId = '',
    ): void {
        $company = Company::query()->find($companyId);
        if ($company === null) {
            Log::notice('stripe.subscription.company_not_found', ['company_id' => $companyId]);

            return;
        }

        $plan = SubscriptionPlan::query()->find($planId);
        if ($plan === null) {
            Log::notice('stripe.subscription.plan_not_found', ['plan_id' => $planId]);

            return;
        }

        $existing = CompanySubscription::query()
            ->where('stripe_subscription_id', $stripeSubscriptionId)
            ->first();
        if ($existing !== null) {
            $company->forceFill(['stripe_customer_id' => $stripeCustomerId])->save();

            return;
        }

        $stripeSub = $this->stripeSubscriptions->retrieve($stripeSubscriptionId);
        $startTs = $stripeSub->current_period_start ?? null;
        $endTs = $stripeSub->current_period_end ?? null;
        if (! is_int($startTs) || ! is_int($endTs)) {
            Log::notice('stripe.subscription.bad_period', ['subscription_id' => $stripeSubscriptionId]);

            return;
        }

        $periodStart = Carbon::createFromTimestamp($startTs);
        $periodEnd = Carbon::createFromTimestamp($endTs);

        $this->provisioning->activateOperationalSubscriptionFromStripe(
            $company,
            $plan,
            $stripeCustomerId,
            $stripeSubscriptionId,
            $periodStart,
            $periodEnd,
        );

        if ($company->company_status !== CompanyStatus::Active) {
            $company->forceFill(['company_status' => CompanyStatus::Active])->save();
        }

        $localSub = CompanySubscription::query()
            ->where('stripe_subscription_id', $stripeSubscriptionId)
            ->first();
        if ($localSub !== null) {
            $this->subscriptionEmails->sendSubscriptionStarted($localSub);
        }

        if ($checkoutSessionId !== '') {
            $this->checkoutAttempts->markCompleted($checkoutSessionId);
        }
    }

    /**
     * @param  array<string, mixed>  $obj
     */
    private function onCheckoutSessionExpired(array $obj): void
    {
        if (($obj['mode'] ?? '') !== 'subscription') {
            return;
        }

        $sessionId = isset($obj['id']) && is_string($obj['id']) ? $obj['id'] : '';
        if ($sessionId === '') {
            return;
        }

        $this->checkoutAttempts->markExpired($sessionId);
    }

    /**
     * @param  array<string, mixed>  $obj
     */
    private function onCustomerSubscriptionUpdated(array $obj): void
    {
        $stripeSubId = $obj['id'] ?? null;
        if (! is_string($stripeSubId) || $stripeSubId === '') {
            return;
        }

        $local = CompanySubscription::query()
            ->where('stripe_subscription_id', $stripeSubId)
            ->first();

        if ($local === null) {
            Log::notice('stripe.subscription.local_row_missing', ['stripe_subscription_id' => $stripeSubId]);

            return;
        }

        $stripeStatus = isset($obj['status']) && is_string($obj['status']) ? $obj['status'] : '';
        $mapped = $this->mapStripeSubscriptionStatus($stripeStatus);
        if ($mapped === null) {
            return;
        }

        $endTs = $obj['current_period_end'] ?? null;
        $renewsAt = is_int($endTs)
            ? Carbon::createFromTimestamp($endTs)->toDateString()
            : $local->renews_at?->toDateString();

        if ($mapped === SubscriptionStatus::Cancelled) {
            $this->billingPeriods->closeAllOpenPeriodsForSubscription($local);
            $local->update([
                'status' => SubscriptionStatus::Cancelled,
                'cancelled_at' => $local->cancelled_at ?? now(),
                'renews_at' => null,
                'stripe_last_payment_failed_at' => null,
            ]);

            return;
        }

        $local->update([
            'status' => $mapped,
            'renews_at' => $renewsAt,
        ]);
    }

    /**
     * @param  array<string, mixed>  $obj
     */
    private function onCustomerSubscriptionDeleted(array $obj): void
    {
        $stripeSubId = $obj['id'] ?? null;
        if (! is_string($stripeSubId) || $stripeSubId === '') {
            return;
        }

        $local = CompanySubscription::query()
            ->where('stripe_subscription_id', $stripeSubId)
            ->first();

        if ($local === null) {
            return;
        }

        $this->billingPeriods->closeAllOpenPeriodsForSubscription($local);
        $local->update([
            'status' => SubscriptionStatus::Cancelled,
            'cancelled_at' => now(),
            'renews_at' => null,
            'stripe_last_payment_failed_at' => null,
        ]);
    }

    private function mapStripeSubscriptionStatus(string $stripeStatus): ?SubscriptionStatus
    {
        return match ($stripeStatus) {
            'active', 'trialing' => SubscriptionStatus::Active,
            'past_due', 'unpaid' => SubscriptionStatus::PastDue,
            'canceled', 'incomplete_expired' => SubscriptionStatus::Cancelled,
            'incomplete' => SubscriptionStatus::Draft,
            default => null,
        };
    }

    /**
     * @param  array<string, mixed>  $obj  Stripe Invoice object
     */
    private function onInvoicePaymentFailed(array $obj): void
    {
        $stripeSubId = $this->stripeSubscriptionIdFromInvoice($obj);
        if ($stripeSubId === null) {
            Log::notice('stripe.webhook.invoice.payment_failed', array_filter([
                'stripe_invoice_id' => isset($obj['id']) && is_string($obj['id']) ? $obj['id'] : null,
                'subscription' => null,
            ]));

            return;
        }

        $local = CompanySubscription::query()
            ->where('stripe_subscription_id', $stripeSubId)
            ->first();

        if ($local === null) {
            Log::notice('stripe.webhook.invoice.payment_failed_no_local_sub', [
                'stripe_subscription_id' => $stripeSubId,
            ]);

            return;
        }

        $local->update([
            'status' => SubscriptionStatus::PastDue,
            'stripe_last_payment_failed_at' => now(),
        ]);

        Log::notice('stripe.webhook.invoice.payment_failed_applied', [
            'company_subscription_id' => (string) $local->id,
            'stripe_subscription_id' => $stripeSubId,
        ]);
    }

    /**
     * @param  array<string, mixed>  $obj  Stripe Invoice object
     */
    private function onInvoicePaid(array $obj): void
    {
        $stripeSubId = $this->stripeSubscriptionIdFromInvoice($obj);
        if ($stripeSubId === null) {
            Log::notice('stripe.webhook.invoice.paid', array_filter([
                'stripe_invoice_id' => isset($obj['id']) && is_string($obj['id']) ? $obj['id'] : null,
            ]));

            return;
        }

        $local = CompanySubscription::query()
            ->where('stripe_subscription_id', $stripeSubId)
            ->first();

        if ($local === null) {
            Log::notice('stripe.webhook.invoice.paid_no_local_sub', [
                'stripe_subscription_id' => $stripeSubId,
            ]);

            return;
        }

        try {
            $stripeSub = $this->stripeSubscriptions->retrieve($stripeSubId);
            $this->syncLocalFromRetrievedStripeSubscription($local->fresh(), $stripeSub);
            Log::notice('stripe.webhook.invoice.paid_applied', [
                'company_subscription_id' => (string) $local->id,
                'stripe_subscription_id' => $stripeSubId,
            ]);
        } catch (Throwable $e) {
            Log::error('stripe.webhook.invoice.paid_sync_failed', [
                'company_subscription_id' => (string) $local->id,
                'stripe_subscription_id' => $stripeSubId,
                'message' => $e->getMessage(),
            ]);
            $local->update([
                'status' => SubscriptionStatus::Active,
                'stripe_last_payment_failed_at' => null,
            ]);
            Log::notice('stripe.webhook.invoice.paid_partial_recovery', [
                'company_subscription_id' => (string) $local->id,
                'stripe_subscription_id' => $stripeSubId,
            ]);
        }
    }

    private function syncLocalFromRetrievedStripeSubscription(CompanySubscription $local, Subscription $stripeSub): void
    {
        $stripeStatus = is_string($stripeSub->status ?? null) ? (string) $stripeSub->status : '';
        $mapped = $this->mapStripeSubscriptionStatus($stripeStatus);
        if ($mapped === null) {
            return;
        }

        $endTs = $stripeSub->current_period_end ?? null;
        $renewsAt = is_int($endTs)
            ? Carbon::createFromTimestamp($endTs)->toDateString()
            : $local->renews_at?->toDateString();

        if ($mapped === SubscriptionStatus::Cancelled) {
            $this->billingPeriods->closeAllOpenPeriodsForSubscription($local);
            $local->update([
                'status' => SubscriptionStatus::Cancelled,
                'cancelled_at' => $local->cancelled_at ?? now(),
                'renews_at' => null,
                'stripe_last_payment_failed_at' => null,
            ]);

            return;
        }

        $local->update([
            'status' => $mapped,
            'renews_at' => $renewsAt,
            'stripe_last_payment_failed_at' => null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $obj  Stripe Invoice object
     */
    private function stripeSubscriptionIdFromInvoice(array $obj): ?string
    {
        $raw = $obj['subscription'] ?? null;
        if (is_string($raw) && $raw !== '') {
            return $raw;
        }
        if (is_array($raw) && isset($raw['id']) && is_string($raw['id']) && $raw['id'] !== '') {
            return $raw['id'];
        }

        return null;
    }
}
