<?php

declare(strict_types=1);

namespace App\Services\Subscriptions;

use App\Enums\OrderStatus;
use App\Enums\ServiceType;
use App\Enums\SubscriptionOrderItemBillingKind;
use App\Enums\SubscriptionStatus;
use App\Models\CompanySubscription;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\SubscriptionPlan;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Computes subscription allowance usage for a completed order (collections + knife units).
 * No proration of workshop list prices — invoice drafting uses overage unit price from the plan.
 */
final class OrderSubscriptionCoverageService
{
    public function computeAndPersist(Order $order): void
    {
        if ($order->subscription_coverage_overridden) {
            return;
        }

        if ($order->order_status === OrderStatus::Cancelled) {
            return;
        }

        $order->loadMissing(['booking', 'items', 'knives', 'company']);

        DB::transaction(function () use ($order): void {
            $snapshot = $this->buildSnapshot($order);
            $order->company_subscription_id = $snapshot['company_subscription_id'];
            $order->subscription_coverage = $snapshot;
            $order->subscription_coverage_computed_at = now();
            $order->save();

            $this->applyItemBillingKinds($order, $snapshot);
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function buildSnapshot(Order $order): array
    {
        $order->loadMissing(['booking', 'items', 'knives', 'company']);

        $sub = CompanySubscription::query()
            ->where('company_id', $order->company_id)
            ->where('status', SubscriptionStatus::Active->value)
            ->with('plan')
            ->first();

        if (! $sub instanceof CompanySubscription || $sub->plan === null) {
            return $this->oneOffSnapshot($order);
        }

        if (! $this->completionWithinSubscriptionWindow($order, $sub)) {
            return $this->oneOffSnapshot($order);
        }

        $plan = $sub->plan;
        $period = $this->periodBounds($sub);
        if ($period === null) {
            return $this->oneOffSnapshot($order);
        }

        [$periodStart, $periodEnd] = $period;

        $collectionUnits = $this->collectionUnitsForOrder($order);
        $knifeUnits = $this->knifeUnitsForOrder($order);

        $prior = $this->priorPeriodUsage($order, $sub, $periodStart, $periodEnd);

        $capColl = $plan->included_collections;
        $capKnife = $plan->included_knife_allowance;

        $remColl = $capColl === null ? PHP_INT_MAX : max(0, $capColl - $prior['collections']);
        $remKnife = $capKnife === null ? PHP_INT_MAX : max(0, $capKnife - $prior['knives']);

        $collIncl = min($collectionUnits, $remColl);
        $collOv = $collectionUnits - $collIncl;

        $knifeIncl = min($knifeUnits, $remKnife);
        $knifeOv = $knifeUnits - $knifeIncl;

        $rate = (int) ($plan->overage_price_amount_minor ?? 0);
        $overageTotal = ($collOv + $knifeOv) * $rate;

        $parts = [];
        if ($collIncl > 0) {
            $parts[] = $collIncl.' collection visit(s) included';
        }
        if ($knifeIncl > 0) {
            $parts[] = $knifeIncl.' knife unit(s) included';
        }
        if ($collOv > 0) {
            $parts[] = $collOv.' collection overage';
        }
        if ($knifeOv > 0) {
            $parts[] = $knifeOv.' knife overage';
        }
        $summary = $parts === [] ? 'Subscription — within allowance' : implode('; ', $parts);

        return [
            'mode' => 'subscription',
            'company_subscription_id' => (string) $sub->id,
            'subscription_plan_id' => (string) $plan->id,
            'plan_name' => $plan->name,
            'billing_period' => [
                'start' => $sub->starts_at?->format('Y-m-d'),
                'end' => $sub->renews_at?->format('Y-m-d'),
            ],
            'collection_units' => $collectionUnits,
            'knife_units' => $knifeUnits,
            'collections_included_for_order' => $collIncl,
            'collections_overage_for_order' => $collOv,
            'knives_included_for_order' => $knifeIncl,
            'knives_overage_for_order' => $knifeOv,
            'overage_unit_price_pence' => $rate,
            'overage_total_pence' => $overageTotal,
            'included_summary' => $summary,
            'prior_period_collections_used' => $prior['collections'],
            'prior_period_knives_used' => $prior['knives'],
        ];
    }

    /**
     * @return array{collections: int, knives: int}
     */
    public function priorPeriodUsage(
        Order $order,
        CompanySubscription $sub,
        CarbonInterface $periodStart,
        CarbonInterface $periodEnd,
    ): array {
        $collections = 0;
        $knives = 0;

        $rows = Order::query()
            ->where('company_id', $order->company_id)
            ->where('company_subscription_id', $sub->id)
            ->where('id', '!=', $order->id)
            ->where('order_status', '!=', OrderStatus::Cancelled->value)
            ->whereNotNull('completed_at')
            ->whereBetween('completed_at', [$periodStart, $periodEnd])
            ->get(['subscription_coverage', 'id']);

        foreach ($rows as $row) {
            $snap = $row->subscription_coverage;
            if (is_array($snap) && ($snap['mode'] ?? '') === 'subscription') {
                $collections += (int) ($snap['collection_units'] ?? 0);
                $knives += (int) ($snap['knife_units'] ?? 0);

                continue;
            }

            $row->loadMissing(['booking', 'items', 'knives']);
            $collections += $this->collectionUnitsForOrder($row);
            $knives += $this->knifeUnitsForOrder($row);
        }

        return ['collections' => $collections, 'knives' => $knives];
    }

    /**
     * @return array<string, mixed>
     */
    public function usageSummaryForSubscription(CompanySubscription $sub): array
    {
        $sub->loadMissing('plan');
        $plan = $sub->plan;
        $period = $this->periodBounds($sub);
        if ($period === null || ! $plan instanceof SubscriptionPlan) {
            return [
                'billing_period' => null,
                'included_collections' => null,
                'included_knife_allowance' => null,
                'collections_used' => 0,
                'knives_used' => 0,
                'collections_overage_units' => 0,
                'knives_overage_units' => 0,
                'estimated_overage_pence' => 0,
                'order_ids' => [],
            ];
        }

        [$periodStart, $periodEnd] = $period;

        $orders = Order::query()
            ->where('company_id', $sub->company_id)
            ->where('company_subscription_id', $sub->id)
            ->where('order_status', '!=', OrderStatus::Cancelled->value)
            ->whereNotNull('completed_at')
            ->whereBetween('completed_at', [$periodStart, $periodEnd])
            ->orderByDesc('completed_at')
            ->get();

        $coll = 0;
        $kn = 0;
        $collOv = 0;
        $knOv = 0;
        $rate = (int) ($plan->overage_price_amount_minor ?? 0);
        $ids = [];

        foreach ($orders as $o) {
            $ids[] = (string) $o->id;
            $snap = $o->subscription_coverage;
            if (! is_array($snap)) {
                continue;
            }
            if (($snap['mode'] ?? '') !== 'subscription') {
                continue;
            }
            $coll += (int) ($snap['collection_units'] ?? 0);
            $kn += (int) ($snap['knife_units'] ?? 0);
            $collOv += (int) ($snap['collections_overage_for_order'] ?? 0);
            $knOv += (int) ($snap['knives_overage_for_order'] ?? 0);
        }

        return [
            'billing_period' => [
                'start' => $sub->starts_at?->format('Y-m-d'),
                'end' => $sub->renews_at?->format('Y-m-d'),
            ],
            'included_collections' => $plan->included_collections,
            'included_knife_allowance' => $plan->included_knife_allowance,
            'collections_used' => $coll,
            'knives_used' => $kn,
            'collections_overage_units' => $collOv,
            'knives_overage_units' => $knOv,
            'estimated_overage_pence' => ($collOv + $knOv) * $rate,
            'order_ids' => $ids,
        ];
    }

    private function oneOffSnapshot(Order $order): array
    {
        return [
            'mode' => 'one_off',
            'company_subscription_id' => null,
            'subscription_plan_id' => null,
            'plan_name' => null,
            'collection_units' => $this->collectionUnitsForOrder($order),
            'knife_units' => $this->knifeUnitsForOrder($order),
            'collections_included_for_order' => 0,
            'collections_overage_for_order' => 0,
            'knives_included_for_order' => 0,
            'knives_overage_for_order' => 0,
            'overage_unit_price_pence' => 0,
            'overage_total_pence' => 0,
            'included_summary' => 'No active subscription for this billing period — standard billing.',
        ];
    }

    private function completionWithinSubscriptionWindow(Order $order, CompanySubscription $sub): bool
    {
        $at = $order->completed_at ?? now();
        $period = $this->periodBounds($sub);
        if ($period === null) {
            return false;
        }

        [$start, $end] = $period;

        return $at->timestamp >= $start->timestamp && $at->timestamp <= $end->timestamp;
    }

    /** @return array{0: CarbonInterface, 1: CarbonInterface}|null */
    private function periodBounds(CompanySubscription $sub): ?array
    {
        if ($sub->starts_at === null || $sub->renews_at === null) {
            return null;
        }

        $start = $sub->starts_at->copy()->startOfDay();
        $end = $sub->renews_at->copy()->endOfDay();

        return [$start, $end];
    }

    private function collectionUnitsForOrder(Order $order): int
    {
        $booking = $order->booking;
        if ($booking === null) {
            return 0;
        }

        return $booking->service_type === ServiceType::Collection ? 1 : 0;
    }

    private function knifeUnitsForOrder(Order $order): int
    {
        $fromCount = (int) $order->knife_count;
        $fromKnives = $order->relationLoaded('knives') ? $order->knives->count() : 0;
        $fromItems = 0;
        if ($order->relationLoaded('items')) {
            foreach ($order->items as $item) {
                $fromItems += max(1, (int) $item->quantity);
            }
        }

        return max($fromCount, $fromKnives, $fromItems);
    }

    /**
     * @param  array<string, mixed>  $snapshot
     */
    private function applyItemBillingKinds(Order $order, array $snapshot): void
    {
        if (($snapshot['mode'] ?? '') !== 'subscription') {
            OrderItem::query()->where('order_id', $order->id)->update([
                'subscription_billing_kind' => SubscriptionOrderItemBillingKind::Na->value,
            ]);

            return;
        }

        $knifeInclBudget = (int) ($snapshot['knives_included_for_order'] ?? 0);
        $items = $order->items()->orderBy('created_at')->get();
        if ($items->isEmpty()) {
            return;
        }

        foreach ($items as $item) {
            $q = max(1, (int) $item->quantity);
            $in = min($knifeInclBudget, $q);
            $knifeInclBudget -= $in;
            $ov = $q - $in;
            if ($ov > 0) {
                $item->subscription_billing_kind = SubscriptionOrderItemBillingKind::Overage;
            } elseif ($in > 0) {
                $item->subscription_billing_kind = SubscriptionOrderItemBillingKind::Included;
            } else {
                $item->subscription_billing_kind = SubscriptionOrderItemBillingKind::Overage;
            }
            $item->save();
        }
    }
}
