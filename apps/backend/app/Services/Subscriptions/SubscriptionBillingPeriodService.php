<?php

declare(strict_types=1);

namespace App\Services\Subscriptions;

use App\Enums\SubscriptionStatus;
use App\Models\CompanySubscription;
use App\Models\SubscriptionBillingPeriod;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Ledger of subscription billing windows (Sprint 10.7). One open row per operational subscription.
 */
final class SubscriptionBillingPeriodService
{
    public function __construct(
        private readonly CompanySubscriptionProvisioningService $provisioning,
        private readonly OrderSubscriptionCoverageService $coverage,
    ) {}

    public function createInitialPeriod(CompanySubscription $sub): void
    {
        if ($sub->starts_at === null || $sub->renews_at === null) {
            return;
        }

        $exists = SubscriptionBillingPeriod::query()
            ->where('company_subscription_id', $sub->id)
            ->exists();

        if ($exists) {
            return;
        }

        SubscriptionBillingPeriod::query()->create([
            'company_subscription_id' => $sub->id,
            'period_index' => 1,
            'starts_on' => $sub->starts_at->toDateString(),
            'ends_on' => $sub->renews_at->toDateString(),
            'closed_at' => null,
            'superseded_by_period_id' => null,
        ]);
    }

    public function closeAllOpenPeriodsForSubscription(CompanySubscription $sub): void
    {
        SubscriptionBillingPeriod::query()
            ->where('company_subscription_id', $sub->id)
            ->whereNull('closed_at')
            ->update(['closed_at' => now()]);
    }

    /**
     * Advance dates on the subscription row and roll the billing period ledger.
     *
     * @return array{subscription: CompanySubscription, new_period: SubscriptionBillingPeriod}
     */
    public function renewOperationalSubscription(CompanySubscription $sub, bool $force = false): array
    {
        if (! in_array($sub->status, [SubscriptionStatus::Active, SubscriptionStatus::PastDue], true)) {
            throw ValidationException::withMessages([
                'status' => 'Only active or past-due subscriptions can roll into a new billing period.',
            ]);
        }

        if ($sub->renews_at === null) {
            throw ValidationException::withMessages([
                'renews_at' => 'Subscription has no renewal date — set dates before renewing.',
            ]);
        }

        $sub->loadMissing('plan');
        $plan = $sub->plan;
        if ($plan === null) {
            throw ValidationException::withMessages([
                'plan' => 'Subscription must have a plan to compute the next renewal window.',
            ]);
        }

        $today = CarbonImmutable::now()->startOfDay();
        if (! $force && $sub->renews_at->greaterThan($today)) {
            throw ValidationException::withMessages([
                'renews_at' => 'Renewal is not due yet. Pass force=true for an administrative early renewal.',
            ]);
        }

        return DB::transaction(function () use ($sub, $plan): array {
            /** @var CompanySubscription $locked */
            $locked = CompanySubscription::query()->whereKey($sub->id)->lockForUpdate()->firstOrFail();

            $open = SubscriptionBillingPeriod::query()
                ->where('company_subscription_id', $locked->id)
                ->whereNull('closed_at')
                ->orderByDesc('period_index')
                ->lockForUpdate()
                ->first();

            $oldEnd = CarbonImmutable::parse($locked->renews_at->toDateString());
            $newStart = $oldEnd->addDay();
            $newRenews = CarbonImmutable::parse(
                $this->provisioning->defaultRenewsAt($plan, $newStart)->toDateString(),
            );

            $nextIndex = (int) (SubscriptionBillingPeriod::query()
                ->where('company_subscription_id', $locked->id)
                ->max('period_index') ?? 0) + 1;

            if ($open instanceof SubscriptionBillingPeriod) {
                $open->update(['closed_at' => now()]);
            }

            $created = SubscriptionBillingPeriod::query()->create([
                'company_subscription_id' => $locked->id,
                'period_index' => $nextIndex,
                'starts_on' => $newStart->toDateString(),
                'ends_on' => $newRenews->toDateString(),
                'closed_at' => null,
                'superseded_by_period_id' => null,
            ]);

            if ($open instanceof SubscriptionBillingPeriod) {
                $open->refresh();
                $open->update(['superseded_by_period_id' => $created->id]);
            }

            $locked->update([
                'starts_at' => $newStart->toDateString(),
                'renews_at' => $newRenews->toDateString(),
                'status' => SubscriptionStatus::Active,
            ]);

            return [
                'subscription' => $locked->fresh(['plan']),
                'new_period' => $created,
            ];
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function periodsWithUsageSummaries(CompanySubscription $sub, int $limit = 36): array
    {
        $sub->loadMissing('plan');

        $periods = SubscriptionBillingPeriod::query()
            ->where('company_subscription_id', $sub->id)
            ->orderByDesc('period_index')
            ->limit($limit)
            ->get();

        $out = [];
        foreach ($periods as $period) {
            $start = CarbonImmutable::parse($period->starts_on->toDateString())->startOfDay();
            $end = CarbonImmutable::parse($period->ends_on->toDateString())->endOfDay();
            $usage = $this->coverage->usageSummaryForWindow($sub, $start, $end);
            $out[] = [
                'period_id' => (string) $period->id,
                'period_index' => (int) $period->period_index,
                'starts_on' => $period->starts_on->toDateString(),
                'ends_on' => $period->ends_on->toDateString(),
                'is_closed' => $period->closed_at !== null,
                'closed_at' => $period->closed_at?->toIso8601String(),
                'usage' => $usage,
            ];
        }

        return $out;
    }

    /**
     * Mark active schedules past renewal day as past_due (internal lifecycle; not payment-provider truth).
     */
    public function markPastDueWhereRenewalElapsed(): int
    {
        $today = now()->toDateString();

        return CompanySubscription::query()
            ->where('status', SubscriptionStatus::Active->value)
            ->whereNotNull('renews_at')
            ->whereDate('renews_at', '<', $today)
            ->update(['status' => SubscriptionStatus::PastDue]);
    }
}
