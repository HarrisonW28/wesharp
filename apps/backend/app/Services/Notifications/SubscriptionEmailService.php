<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\Contact;
use App\Models\Order;
use App\Services\Subscriptions\OrderSubscriptionCoverageService;
use App\Support\Money\MoneyFormatting;
use App\Support\Portal\CustomerPortalUrls;
use App\Support\Subscriptions\SubscriptionCustomerRef;
use Illuminate\Support\Str;

/**
 * Customer subscription emails (Sprint 10.5). Billing-provider events (renewal charged, payment failed)
 * are only sent when wired to a real payment source — see method docblocks.
 */
final class SubscriptionEmailService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly InAppNotificationDispatcher $inApp,
    ) {}

    public function sendSubscriptionStarted(CompanySubscription $subscription): void
    {
        $subscription = $this->ensureLoaded($subscription);
        $type = 'subscription.started';
        $idempotencyKey = NotificationService::idempotencyKey($type, CompanySubscription::class, (string) $subscription->id);

        $ref = SubscriptionCustomerRef::reference($subscription);
        $greet = $this->greetingName($subscription);
        $planName = $subscription->plan?->name ?? 'your plan';
        $renews = $subscription->renews_at?->format('j M Y');
        $period = $this->periodLine($subscription);
        $allowance = $this->allowancePlainEnglish($subscription);
        $price = MoneyFormatting::formatGbpFromPence((int) $subscription->price_amount_minor_snapshot);

        $body = trim(implode("\n\n", array_filter([
            "Hi {$greet},\n\nYour WeSharp subscription is now active.",
            "Plan: {$planName}",
            "Reference: {$ref}",
            $period,
            "Your subscription price for this term: {$price}.",
            $allowance,
            $renews !== null ? "Next renewal date: {$renews}." : null,
            'Track allowance and usage any time under Account → Subscription in your portal.',
            'Reply to this email if anything looks wrong.',
        ])));

        $this->queue($subscription, $type, $idempotencyKey, 'Your WeSharp subscription is active', 'Subscription started', $body);
    }

    public function sendPlanChanged(CompanySubscription $newSubscription, string $priorPlanName): void
    {
        $newSubscription = $this->ensureLoaded($newSubscription);
        $type = 'subscription.plan_changed';
        $idempotencyKey = NotificationService::idempotencyKey($type, CompanySubscription::class, (string) $newSubscription->id);

        $ref = SubscriptionCustomerRef::reference($newSubscription);
        $greet = $this->greetingName($newSubscription);
        $newName = $newSubscription->plan?->name ?? 'your new plan';
        $renews = $newSubscription->renews_at?->format('j M Y');
        $allowance = $this->allowancePlainEnglish($newSubscription);
        $price = MoneyFormatting::formatGbpFromPence((int) $newSubscription->price_amount_minor_snapshot);

        $body = trim(implode("\n\n", array_filter([
            "Hi {$greet},\n\nWe’ve updated your subscription plan.",
            "Reference: {$ref}",
            "Previous plan: {$priorPlanName}",
            "New plan: {$newName}",
            "Updated subscription price: {$price}.",
            $allowance,
            $renews !== null ? "Next renewal date: {$renews}." : null,
            'Open Account → Subscription for the full breakdown.',
        ])));

        $this->queue($newSubscription, $type, $idempotencyKey, 'Your subscription plan has changed', 'Plan updated', $body);
    }

    public function sendSubscriptionCancelled(CompanySubscription $subscription): void
    {
        $subscription = $this->ensureLoaded($subscription);
        $type = 'subscription.cancelled';
        $idempotencyKey = NotificationService::idempotencyKey($type, CompanySubscription::class, (string) $subscription->id);

        $ref = SubscriptionCustomerRef::reference($subscription);
        $greet = $this->greetingName($subscription);
        $planName = $subscription->plan?->name ?? 'your plan';

        $body = trim(implode("\n\n", [
            "Hi {$greet},\n\nYour WeSharp subscription has been cancelled as requested.",
            "Reference: {$ref}",
            "Plan was: {$planName}.",
            'You can still use the portal for orders and invoices already on your account.',
            'If you didn’t ask for this, reply and we’ll help straight away.',
        ]));

        $this->queue($subscription, $type, $idempotencyKey, 'Your subscription has been cancelled', 'Subscription cancelled', $body);
    }

    public function sendSubscriptionReactivated(CompanySubscription $subscription): void
    {
        $subscription = $this->ensureLoaded($subscription);
        $type = 'subscription.reactivated';
        $idempotencyKey = NotificationService::idempotencyKey($type, CompanySubscription::class, (string) $subscription->id);

        $ref = SubscriptionCustomerRef::reference($subscription);
        $greet = $this->greetingName($subscription);
        $planName = $subscription->plan?->name ?? 'your plan';
        $renews = $subscription->renews_at?->format('j M Y');
        $allowance = $this->allowancePlainEnglish($subscription);

        $body = trim(implode("\n\n", array_filter([
            "Hi {$greet},\n\nWelcome back — your WeSharp subscription is active again.",
            "Reference: {$ref}",
            "Plan: {$planName}",
            $allowance,
            $renews !== null ? "Next renewal date: {$renews}." : null,
            'See Account → Subscription for details.',
        ])));

        $this->queue($subscription, $type, $idempotencyKey, 'Your subscription is active again', 'Subscription restarted', $body);
    }

    public function sendRenewalUpcoming(CompanySubscription $subscription): void
    {
        $subscription = $this->ensureLoaded($subscription);
        $type = 'subscription.renewal.upcoming';
        $renewsYmd = $subscription->renews_at?->toDateString() ?? '';
        $idempotencyKey = NotificationService::idempotencyKey($type, CompanySubscription::class, (string) $subscription->id, $renewsYmd);

        $ref = SubscriptionCustomerRef::reference($subscription);
        $greet = $this->greetingName($subscription);
        $planName = $subscription->plan?->name ?? 'your plan';
        $renews = $subscription->renews_at?->format('j M Y');
        $price = MoneyFormatting::formatGbpFromPence((int) $subscription->price_amount_minor_snapshot);

        $body = trim(implode("\n\n", array_filter([
            "Hi {$greet},\n\nA quick reminder about your WeSharp subscription.",
            "Reference: {$ref}",
            "Plan: {$planName}",
            $renews !== null ? "Your current period renews on {$renews}." : null,
            "Unless something changes on your account, we’ll continue at {$price} for the subscription fee — any usage over your allowance may be billed separately (see your invoices when issued).",
            'Questions? Reply to this email — we’re happy to help.',
        ])));

        $this->queue($subscription, $type, $idempotencyKey, 'Subscription renewal coming up', 'Renewal reminder', $body);

        $snippet = mb_substr(trim(str_replace(["\n", "\r"], ' ', $body)), 0, 280);
        $this->inApp->notifyCustomersSubscription(
            $subscription,
            'customer.'.$type,
            'Renewal reminder',
            $snippet !== '' ? $snippet : 'Your subscription renews soon.',
            $renewsYmd,
        );
    }

    /**
     * Usage snapshot for the current billing window (from subscription dates + completed orders).
     * Not a tax invoice — subscription invoices remain the billing source of truth.
     */
    public function sendPeriodUsageSummary(CompanySubscription $subscription): void
    {
        $subscription = $this->ensureLoaded($subscription);
        $type = 'subscription.usage.period_summary';
        $renewsYmd = $subscription->renews_at?->toDateString() ?? '';
        $idempotencyKey = NotificationService::idempotencyKey($type, CompanySubscription::class, (string) $subscription->id, $renewsYmd);

        $usage = app(OrderSubscriptionCoverageService::class)->usageSummaryForSubscription($subscription);
        $ref = SubscriptionCustomerRef::reference($subscription);
        $greet = $this->greetingName($subscription);
        $planName = $subscription->plan?->name ?? 'your plan';

        $collU = (int) ($usage['collections_used'] ?? 0);
        $knU = (int) ($usage['knives_used'] ?? 0);
        $collOv = (int) ($usage['collections_overage_units'] ?? 0);
        $knOv = (int) ($usage['knives_overage_units'] ?? 0);
        $ovPence = (int) ($usage['estimated_overage_pence'] ?? 0);

        $incColl = $usage['included_collections'];
        $incKn = $usage['included_knife_allowance'];

        $usageLines = array_filter([
            $incColl !== null ? "Collection visits this period: {$collU} ({$incColl} included in your plan)." : ($collU > 0 ? "Collection visits this period: {$collU}." : null),
            $incKn !== null ? "Knife / service units this period: {$knU} ({$incKn} included in your plan)." : ($knU > 0 ? "Knife / service units this period: {$knU}." : null),
            ($collOv + $knOv) > 0
                ? 'Extra usage this period: '.($collOv + $knOv).' unit(s) beyond your included allowance — estimated extra at period rates: '.MoneyFormatting::formatGbpFromPence($ovPence).' (final amounts follow your invoices).'
                : null,
        ]);

        $body = trim(implode("\n\n", array_filter([
            "Hi {$greet},\n\nHere’s a friendly snapshot of your subscription usage before your period rolls forward.",
            "Reference: {$ref}",
            "Plan: {$planName}",
            ...$usageLines,
            'Full detail: Account → Subscription.',
        ])));

        if ($collU === 0 && $knU === 0 && ($collOv + $knOv) === 0) {
            return;
        }

        $this->queue($subscription, $type, $idempotencyKey, 'Your subscription usage snapshot', 'Usage summary', $body);
    }

    /**
     * @param  array<string, mixed>  $snapshot  Order subscription_coverage payload (subscription mode).
     */
    public function sendUsageOverage(Order $order, CompanySubscription $subscription, array $snapshot): void
    {
        $subscription = $this->ensureLoaded($subscription);
        $type = 'subscription.usage.overage';
        $idempotencyKey = NotificationService::idempotencyKey($type, Order::class, (string) $order->id);

        $ref = SubscriptionCustomerRef::reference($subscription);
        $greet = $this->greetingName($subscription);
        $collOv = (int) ($snapshot['collections_overage_for_order'] ?? 0);
        $knOv = (int) ($snapshot['knives_overage_for_order'] ?? 0);
        $est = (int) ($snapshot['overage_total_pence'] ?? 0);
        $summary = (string) ($snapshot['included_summary'] ?? '');

        $body = trim(implode("\n\n", array_filter([
            "Hi {$greet},\n\nWe’ve completed work that uses a little more than your plan’s included allowance — that’s normal when you’re busy in the kitchen.",
            "Subscription reference: {$ref}",
            $summary !== '' ? "Details: {$summary}" : null,
            ($collOv + $knOv) > 0 ? 'Extra units on this order: '.($collOv + $knOv).' — estimated extra at your plan\'s overage rate: '.MoneyFormatting::formatGbpFromPence($est).' (confirm on your next invoice).' : null,
            'Account → Subscription shows how allowances work.',
        ])));

        $this->queue($subscription, $type, $idempotencyKey, 'Subscription usage — overage on a recent order', 'Allowance heads-up', $body);

        $snippet = mb_substr(trim(str_replace(["\n", "\r"], ' ', $body)), 0, 280);
        $this->inApp->notifyCustomersSubscription(
            $subscription,
            'customer.'.$type,
            'Allowance heads-up',
            $snippet !== '' ? $snippet : 'There was usage beyond your included allowance.',
            'order:'.$order->id,
        );
    }

    /**
     * @param  array<string, mixed>  $usage  {@see OrderSubscriptionCoverageService::usageSummaryForSubscription}
     */
    public function sendAllowanceNearlyExhausted(
        CompanySubscription $subscription,
        string $dimension,
        array $usage,
        string $periodKey,
    ): void {
        $subscription = $this->ensureLoaded($subscription);
        $type = 'subscription.usage.allowance_heads_up';
        $idempotencyKey = NotificationService::idempotencyKey($type, CompanySubscription::class, (string) $subscription->id, $periodKey.'|'.$dimension);

        $ref = SubscriptionCustomerRef::reference($subscription);
        $greet = $this->greetingName($subscription);
        $line = $dimension === 'collections'
            ? 'You’ve used most of your included collection visits for this period.'
            : 'You’ve used most of your included knife allowance for this period.';

        $collU = (int) ($usage['collections_used'] ?? 0);
        $knU = (int) ($usage['knives_used'] ?? 0);
        $incColl = $usage['included_collections'];
        $incKn = $usage['included_knife_allowance'];

        $body = trim(implode("\n\n", array_filter([
            "Hi {$greet},\n\n{$line}",
            "Subscription reference: {$ref}",
            $incColl !== null ? "Collection visits used: {$collU} of {$incColl}." : null,
            $incKn !== null ? "Knife units counted: {$knU} of {$incKn}." : null,
            'Further work in this period may roll into overage — we’ll always show that clearly on your invoice.',
            'Account → Subscription has the live picture.',
        ])));

        $this->queue($subscription, $type, $idempotencyKey, 'Subscription allowance — almost at the limit', 'Allowance reminder', $body);
    }

    /**
     * Call only from a verified payment-provider failure (e.g. future Stripe). Do not invent decline reasons.
     */
    public function sendSubscriptionPaymentFailed(CompanySubscription $subscription, string $customerSafeReason): void
    {
        $subscription = $this->ensureLoaded($subscription);
        $type = 'subscription.payment_failed';
        $idempotencyKey = NotificationService::idempotencyKey(
            $type,
            CompanySubscription::class,
            (string) $subscription->id,
            hash('sha256', $customerSafeReason),
        );

        $ref = SubscriptionCustomerRef::reference($subscription);
        $greet = $this->greetingName($subscription);
        $reason = Str::limit(trim($customerSafeReason), 400);

        $body = trim(implode("\n\n", [
            "Hi {$greet},\n\nWe couldn’t complete your latest subscription payment.",
            "Reference: {$ref}",
            "Detail: {$reason}",
            'No need to worry — your account is still here. Please check your payment method when you can, or reply and we’ll help with alternatives.',
        ]));

        $this->queue($subscription, $type, $idempotencyKey, 'Subscription payment didn’t go through', 'Payment issue', $body);
    }

    /**
     * When subscription status becomes Expired in-app (no automatic renew yet). Wire when that transition exists.
     */
    public function sendSubscriptionExpired(CompanySubscription $subscription): void
    {
        $subscription = $this->ensureLoaded($subscription);
        $type = 'subscription.expired';
        $idempotencyKey = NotificationService::idempotencyKey($type, CompanySubscription::class, (string) $subscription->id);

        $ref = SubscriptionCustomerRef::reference($subscription);
        $greet = $this->greetingName($subscription);

        $body = trim(implode("\n\n", [
            "Hi {$greet},\n\nYour WeSharp subscription has reached its end date.",
            "Reference: {$ref}",
            'You can still use the portal for existing orders and invoices. If you’d like to subscribe again, reply or open Account → Subscription.',
        ]));

        $this->queue($subscription, $type, $idempotencyKey, 'Your subscription has ended', 'Subscription ended', $body);
    }

    private function periodLine(CompanySubscription $subscription): ?string
    {
        $s = $subscription->starts_at?->format('j M Y');
        $e = $subscription->renews_at?->format('j M Y');
        if ($s === null || $e === null) {
            return null;
        }

        return "Current billing period: {$s} – {$e}.";
    }

    private function allowancePlainEnglish(CompanySubscription $subscription): ?string
    {
        $plan = $subscription->plan;
        if ($plan === null) {
            return null;
        }

        $parts = [];
        if ($plan->included_collections !== null) {
            $parts[] = $plan->included_collections.' collection visit(s) included per period';
        }
        if ($plan->included_knife_allowance !== null) {
            $parts[] = $plan->included_knife_allowance.' knife / service unit(s) included per period';
        }
        $rate = (int) ($plan->overage_price_amount_minor ?? 0);
        if ($rate > 0 && ($plan->included_collections !== null || $plan->included_knife_allowance !== null)) {
            $parts[] = 'extra usage at '.MoneyFormatting::formatGbpFromPence($rate).' per unit beyond that';
        }

        return $parts === [] ? null : implode(', ', $parts).'.';
    }

    private function greetingName(CompanySubscription $subscription): string
    {
        $c = $subscription->billingContact;
        if ($c instanceof Contact) {
            $name = trim(trim((string) $c->first_name).' '.trim((string) $c->last_name));
            if ($name !== '') {
                return $name;
            }
        }

        $company = $subscription->company;

        return $company instanceof Company ? (string) $company->name : 'there';
    }

    private function ensureLoaded(CompanySubscription $subscription): CompanySubscription
    {
        if ($subscription->relationLoaded('company')) {
            $subscription->unsetRelation('company');
        }
        if ($subscription->relationLoaded('plan')) {
            $subscription->unsetRelation('plan');
        }
        if ($subscription->relationLoaded('billingContact')) {
            $subscription->unsetRelation('billingContact');
        }

        $subscription->loadMissing(['company', 'plan', 'billingContact']);

        return $subscription;
    }

    private function recipientEmail(CompanySubscription $subscription): ?string
    {
        $c = $subscription->billingContact;
        if ($c instanceof Contact) {
            $email = trim((string) ($c->email ?? ''));
            if ($email !== '') {
                return $email;
            }
        }

        $company = $subscription->company;
        if ($company instanceof Company) {
            $email = trim((string) ($company->billing_email ?? ''));
            if ($email !== '') {
                return $email;
            }
        }

        return null;
    }

    private function recipientName(CompanySubscription $subscription): ?string
    {
        $c = $subscription->billingContact;
        if ($c instanceof Contact) {
            $name = trim(trim((string) $c->first_name).' '.trim((string) $c->last_name));

            return $name !== '' ? $name : null;
        }

        return null;
    }

    private function queue(
        CompanySubscription $subscription,
        string $type,
        string $idempotencyKey,
        string $subject,
        string $headline,
        string $body,
    ): void {
        $subscription = $this->ensureLoaded($subscription);
        $to = $this->recipientEmail($subscription);
        $name = $this->recipientName($subscription);
        $planName = $subscription->plan?->name;

        $ctx = [
            'company_id' => (string) $subscription->company_id,
            'recipient_email' => $to,
            'recipient_name' => $name,
            'source_type' => CompanySubscription::class,
            'source_id' => (string) $subscription->id,
            'meta' => [
                'subscription_reference' => SubscriptionCustomerRef::reference($subscription),
                'plan_name' => $planName,
            ],
        ];

        if ($to === null || trim($to) === '') {
            $this->notifications->recordEmailDelivery(
                type: $type,
                idempotencyKey: $idempotencyKey,
                ctx: $ctx,
                status: 'failed',
                failureReason: 'No recipient email available for this subscription.',
                meta: [
                    'subject' => $subject,
                    'view' => 'emails.notifications.subscription',
                ],
            );

            return;
        }

        $this->notifications->queueEmail(
            type: $type,
            idempotencyKey: $idempotencyKey,
            subject: $subject,
            view: 'emails.notifications.subscription',
            viewData: [
                'headline' => $headline,
                'body' => $body,
                'subscriptionReference' => SubscriptionCustomerRef::reference($subscription),
                'planName' => $planName,
                'supportEmail' => config('mail.from.address'),
                'supportPhone' => $subscription->company instanceof Company ? $subscription->company->phone : null,
                'portalSubscriptionUrl' => CustomerPortalUrls::subscription(),
            ],
            ctx: $ctx,
        );
    }
}
