<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Enums\CostAllocationTargetType;
use App\Enums\InvoiceLineItemType;
use App\Enums\InvoiceStatus;
use App\Enums\SubscriptionStatus;
use App\Http\Requests\Admin\SubscriptionProfitabilityReportRequest;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\CostAllocation;
use App\Models\InvoiceItem;
use App\Models\Order;
use App\Support\Money\MoneyFormatting;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/**
 * Sprint 24.3 — subscription profitability without treating covered usage as normal one-off revenue.
 */
final class SubscriptionProfitabilityReportService
{
    private const COMPANY_ROW_LIMIT = 75;

    private const LOW_MARGIN_RATIO = 0.15;

    public function __construct(
        private readonly RecurringRevenueMetricsService $recurringRevenueMetrics,
    ) {}

    /** @return array<string, mixed> */
    public function build(SubscriptionProfitabilityReportRequest $request): array
    {
        $tz = config('app.timezone', 'UTC');
        $now = CarbonImmutable::now($tz);

        /** @var string|null $df */
        $df = $request->validated('date_from');
        /** @var string|null $dt */
        $dt = $request->validated('date_to');
        /** @var string|null $companyId */
        $companyId = $request->validated('company_id');
        /** @var string|null $planId */
        $planId = $request->validated('subscription_plan_id');

        $periodStart = $df !== null ? CarbonImmutable::parse($df, $tz)->startOfDay() : $now->startOfMonth();
        $periodEnd = $dt !== null ? CarbonImmutable::parse($dt, $tz)->endOfDay() : $now->endOfMonth();

        $recurring = $this->recurringRevenueMetrics->build($periodStart, $periodEnd, $companyId, $planId, null);

        $lineTotals = $this->invoiceLineTotalsForSubscriptionInvoices($periodStart, $periodEnd, $companyId, $planId);

        $orderUsage = $this->orderSubscriptionUsageByCompany($periodStart, $periodEnd, $companyId, $planId);

        $allocByCompany = $this->allocatedCostByCompany($periodStart, $periodEnd, $companyId, $planId);

        $subscriptionCustomers = $this->distinctSubscriptionCustomerCount($companyId, $planId);

        $failedPayments = $this->failedPaymentSubscriptionsCount($companyId, $planId);

        $renewalsInPeriod = is_array($recurring['upcoming_renewals'] ?? null) ? count($recurring['upcoming_renewals']) : 0;

        $maps = $this->mapsFromRecurring($recurring);

        $companyRows = $this->mergeCompanyRows(
            $maps,
            $orderUsage,
            $allocByCompany,
            $companyId,
            $planId,
        );

        $highUsage = array_values(array_filter($companyRows, static fn (array $r): bool => $r['flags']['high_usage']));
        $lowMargin = array_values(array_filter($companyRows, static fn (array $r): bool => $r['flags']['low_margin_estimate']));

        $coveredTotals = $this->sumCoveredOverageUnitsGlobal($orderUsage);

        return [
            'definitions' => [
                'report_purpose' => 'Separate subscription-tagged invoice economics from ordinary one-off invoices; surface covered vs overage usage from completed orders.',
                'recurring_subscription_revenue_lines' => 'Invoice line totals with line_item_type = subscription on subscription-flagged invoices issued in the period (void excluded).',
                'overage_revenue_lines' => 'Invoice line totals with line_item_type = overage on subscription-flagged invoices issued in the period (void excluded).',
                'one_off_invoice_revenue' => 'Invoice totals issued in period without subscription billing flag (void excluded) — must not be treated as subscription revenue.',
                'covered_usage_units' => 'Collection/knife units billed as included allowance on completed orders whose subscription_coverage.mode = subscription.',
                'overage_usage_units' => 'Collection/knife units beyond allowance on those orders (see subscription_coverage JSON).',
                'allocated_costs' => 'Sum of cost_allocations rows created in the period targeting company_subscriptions or subscription-covered orders.',
                'gross_margin_estimate' => '(subscription line revenue + overage line revenue) − allocated subscription/order costs for that company in the period — illustrative until finance agrees fully-loaded rules.',
                'high_usage' => 'Heuristic: ≥5 overage units in period OR overage revenue in top quartile of scoped companies.',
                'low_margin' => 'Gross margin estimate ÷ max(revenue,1) below '.(string) (self::LOW_MARGIN_RATIO * 100).'% with revenue > 0.',
                'churn_risk' => 'Subscription row is past_due, has a recorded Stripe payment failure timestamp, or renewal falls within the report window with elevated usage.',
            ],
            'filters_applied' => [
                'date_from' => $periodStart->toDateString(),
                'date_to' => $periodEnd->toDateString(),
                'company_id' => $companyId,
                'subscription_plan_id' => $planId,
            ],
            'kpis' => [
                'subscription_customers_distinct' => $subscriptionCustomers,
                'failed_payment_subscriptions_count' => $failedPayments,
                'renewals_due_in_period_count' => $renewalsInPeriod,
                'covered_collection_units_in_period' => $coveredTotals['collections_included'],
                'covered_knife_units_in_period' => $coveredTotals['knives_included'],
                'overage_collection_units_in_period' => $coveredTotals['collections_overage'],
                'overage_knife_units_in_period' => $coveredTotals['knives_overage'],
                'subscription_line_revenue_period_pence' => $lineTotals['subscription_lines_pence'],
                'formatted_subscription_line_revenue_period' => MoneyFormatting::formatGbpFromPence($lineTotals['subscription_lines_pence']),
                'overage_revenue_period_pence' => $lineTotals['overage_lines_pence'],
                'formatted_overage_revenue_period' => MoneyFormatting::formatGbpFromPence($lineTotals['overage_lines_pence']),
                'subscription_margin_estimate_period_pence' => $lineTotals['subscription_lines_pence'] + $lineTotals['overage_lines_pence'] - $allocByCompany['_total'],
                'formatted_subscription_margin_estimate_period' => MoneyFormatting::formatGbpFromPence($lineTotals['subscription_lines_pence'] + $lineTotals['overage_lines_pence'] - $allocByCompany['_total']),
            ],
            'recurring_revenue_context' => $recurring,
            'split_for_rules' => [
                'recurring_subscription_invoice_lines_pence' => $lineTotals['subscription_lines_pence'],
                'overage_invoice_lines_pence' => $lineTotals['overage_lines_pence'],
                'one_off_invoice_revenue_period_pence' => (int) ($recurring['revenue_invoiced_period_pence']['one_off'] ?? 0),
                'formatted_one_off_invoice_revenue_period' => MoneyFormatting::formatGbpFromPence((int) ($recurring['revenue_invoiced_period_pence']['one_off'] ?? 0)),
                'note' => 'One-off bucket uses invoice totals without subscription billing flag (includes workshop invoices). Covered allowance work is typically £0 subscription lines — revenue recognition stays on subscription + overage lines.',
            ],
            'companies' => $companyRows,
            'flags' => [
                'high_usage_customers' => array_slice($highUsage, 0, 25),
                'low_margin_subscription_customers' => array_slice($lowMargin, 0, 25),
            ],
            'disclaimer' => 'Figures are operational estimates from ledger rows (orders, invoices, allocations). They do not replace audited subscription revenue recognition.',
        ];
    }

    /**
     * @return array{subscription_lines_pence: int, overage_lines_pence: int}
     */
    private function invoiceLineTotalsForSubscriptionInvoices(
        CarbonImmutable $periodStart,
        CarbonImmutable $periodEnd,
        ?string $companyId,
        ?string $planId,
    ): array {
        $base = fn (InvoiceLineItemType $type) => InvoiceItem::query()
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->whereBetween('invoices.issued_on', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->where('invoices.invoice_status', '!=', InvoiceStatus::Void->value)
            ->where('invoices.is_subscription_billing', true)
            ->where('invoice_items.line_item_type', $type->value)
            ->when($companyId !== null, fn (Builder $b) => $b->where('invoices.company_id', $companyId))
            ->when($planId !== null, fn (Builder $b) => $b->whereExists(function ($sq) use ($planId): void {
                $sq->selectRaw('1')
                    ->from('company_subscriptions')
                    ->whereColumn('company_subscriptions.id', 'invoices.source_id')
                    ->where('company_subscriptions.subscription_plan_id', $planId);
            }));

        return [
            'subscription_lines_pence' => (int) $base(InvoiceLineItemType::Subscription)->sum('invoice_items.line_total_pence'),
            'overage_lines_pence' => (int) $base(InvoiceLineItemType::Overage)->sum('invoice_items.line_total_pence'),
        ];
    }

    /**
     * @return array<string, array{collections_included: int, knives_included: int, collections_overage: int, knives_overage: int, overage_implied_pence: int}>
     */
    private function orderSubscriptionUsageByCompany(
        CarbonImmutable $periodStart,
        CarbonImmutable $periodEnd,
        ?string $companyId,
        ?string $planId,
    ): array {
        $orders = Order::query()
            ->completed()
            ->whereBetween('completed_at', [$periodStart, $periodEnd])
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId))
            ->when($planId !== null, fn (Builder $q) => $q->whereHas('companySubscription', fn (Builder $b) => $b->where('subscription_plan_id', $planId)))
            ->whereNotNull('subscription_coverage')
            ->get(['id', 'company_id', 'subscription_coverage']);

        $map = [];

        foreach ($orders as $order) {
            /** @var array<string, mixed>|null $cov */
            $cov = $order->subscription_coverage;
            if (! is_array($cov) || ($cov['mode'] ?? '') !== 'subscription') {
                continue;
            }

            $cid = (string) $order->company_id;
            if (! isset($map[$cid])) {
                $map[$cid] = [
                    'collections_included' => 0,
                    'knives_included' => 0,
                    'collections_overage' => 0,
                    'knives_overage' => 0,
                    'overage_implied_pence' => 0,
                ];
            }

            $map[$cid]['collections_included'] += (int) ($cov['collections_included_for_order'] ?? 0);
            $map[$cid]['knives_included'] += (int) ($cov['knives_included_for_order'] ?? 0);
            $map[$cid]['collections_overage'] += (int) ($cov['collections_overage_for_order'] ?? 0);
            $map[$cid]['knives_overage'] += (int) ($cov['knives_overage_for_order'] ?? 0);
            $map[$cid]['overage_implied_pence'] += (int) ($cov['overage_total_pence'] ?? 0);
        }

        return $map;
    }

    /**
     * @return array<string|'_total', int> company_id => pence; _total sums all
     */
    private function allocatedCostByCompany(
        CarbonImmutable $periodStart,
        CarbonImmutable $periodEnd,
        ?string $companyId,
        ?string $planId,
    ): array {
        $total = 0;
        $map = [];

        $subscriptionAlloc = CostAllocation::query()
            ->join('company_subscriptions', 'cost_allocations.target_id', '=', 'company_subscriptions.id')
            ->where('cost_allocations.target_type', CostAllocationTargetType::Subscription->value)
            ->whereBetween('cost_allocations.created_at', [$periodStart, $periodEnd])
            ->when($companyId !== null, fn (Builder $b) => $b->where('company_subscriptions.company_id', $companyId))
            ->when($planId !== null, fn (Builder $b) => $b->where('company_subscriptions.subscription_plan_id', $planId))
            ->selectRaw('company_subscriptions.company_id AS cid, SUM(cost_allocations.amount_pence) AS s')
            ->groupBy('company_subscriptions.company_id')
            ->get();

        foreach ($subscriptionAlloc as $row) {
            $cid = (string) $row->cid;
            $p = (int) $row->s;
            $map[$cid] = ($map[$cid] ?? 0) + $p;
            $total += $p;
        }

        $orderAlloc = CostAllocation::query()
            ->join('orders', 'cost_allocations.target_id', '=', 'orders.id')
            ->where('cost_allocations.target_type', CostAllocationTargetType::Order->value)
            ->whereBetween('cost_allocations.created_at', [$periodStart, $periodEnd])
            ->whereNotNull('orders.company_subscription_id')
            ->when($companyId !== null, fn (Builder $b) => $b->where('orders.company_id', $companyId))
            ->when($planId !== null, fn (Builder $b) => $b->whereExists(function ($sq) use ($planId): void {
                $sq->selectRaw('1')
                    ->from('company_subscriptions AS cs')
                    ->whereColumn('cs.id', 'orders.company_subscription_id')
                    ->where('cs.subscription_plan_id', $planId);
            }))
            ->selectRaw('orders.company_id AS cid, SUM(cost_allocations.amount_pence) AS s')
            ->groupBy('orders.company_id')
            ->get();

        foreach ($orderAlloc as $row) {
            $cid = (string) $row->cid;
            $p = (int) $row->s;
            $map[$cid] = ($map[$cid] ?? 0) + $p;
            $total += $p;
        }

        $map['_total'] = $total;

        return $map;
    }

    private function distinctSubscriptionCustomerCount(?string $companyId, ?string $planId): int
    {
        return (int) CompanySubscription::query()
            ->whereIn('status', [SubscriptionStatus::Active->value, SubscriptionStatus::PastDue->value])
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId))
            ->when($planId !== null, fn (Builder $q) => $q->where('subscription_plan_id', $planId))
            ->distinct('company_id')
            ->count('company_id');
    }

    private function failedPaymentSubscriptionsCount(?string $companyId, ?string $planId): int
    {
        return (int) CompanySubscription::query()
            ->whereNotNull('stripe_last_payment_failed_at')
            ->whereIn('status', [SubscriptionStatus::Active->value, SubscriptionStatus::PastDue->value])
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId))
            ->when($planId !== null, fn (Builder $q) => $q->where('subscription_plan_id', $planId))
            ->count();
    }

    /**
     * @param  array<string, mixed>  $recurring
     * @return array{subRev: array<string, int>, ovRev: array<string, int>}
     */
    private function mapsFromRecurring(array $recurring): array
    {
        $subRev = [];
        foreach ($recurring['revenue_subscription_lines_by_company'] ?? [] as $row) {
            if (is_array($row) && isset($row['company_id'])) {
                $subRev[(string) $row['company_id']] = (int) ($row['subscription_revenue_pence'] ?? 0);
            }
        }
        $ovRev = [];
        foreach ($recurring['revenue_overage_lines_by_company'] ?? [] as $row) {
            if (is_array($row) && isset($row['company_id'])) {
                $ovRev[(string) $row['company_id']] = (int) ($row['overage_revenue_pence'] ?? 0);
            }
        }

        return ['subRev' => $subRev, 'ovRev' => $ovRev];
    }

    /**
     * @param  array{subRev: array<string, int>, ovRev: array<string, int>}  $maps
     * @param  array<string, array{collections_included: int, knives_included: int, collections_overage: int, knives_overage: int, overage_implied_pence: int}>  $orderUsage
     * @param  array<string|'_total', int>  $allocByCompany
     * @return list<array<string, mixed>>
     */
    private function mergeCompanyRows(
        array $maps,
        array $orderUsage,
        array $allocByCompany,
        ?string $scopedCompanyId,
        ?string $planId,
    ): array {
        $ids = array_unique(array_merge(
            array_keys($maps['subRev']),
            array_keys($maps['ovRev']),
            array_keys($orderUsage),
            array_keys(array_diff_key($allocByCompany, ['_total' => true])),
        ));

        $overageAmounts = array_values(array_filter(array_map(static fn (array $u): int => $u['collections_overage'] + $u['knives_overage'], $orderUsage)));
        rsort($overageAmounts);
        $thresholdUnit = $overageAmounts[max(0, (int) floor(count($overageAmounts) * 0.25))] ?? 5;

        $subsMeta = $this->subscriptionMetaByCompany($ids, $planId);

        $rows = [];

        foreach ($ids as $cid) {
            $subPence = $maps['subRev'][$cid] ?? 0;
            $ovPence = $maps['ovRev'][$cid] ?? 0;
            $usage = $orderUsage[$cid] ?? [
                'collections_included' => 0,
                'knives_included' => 0,
                'collections_overage' => 0,
                'knives_overage' => 0,
                'overage_implied_pence' => 0,
            ];

            $alloc = $allocByCompany[$cid] ?? 0;
            $rev = $subPence + $ovPence;
            $margin = $rev - $alloc;
            $marginRatio = $rev > 0 ? $margin / $rev : null;

            $ovUnits = $usage['collections_overage'] + $usage['knives_overage'];
            $highUsage = $ovUnits >= max(5, $thresholdUnit);

            $lowMargin = $marginRatio !== null && $rev > 0 && $marginRatio < self::LOW_MARGIN_RATIO;

            $meta = $subsMeta[$cid] ?? null;
            $churnRisk = $meta !== null && (
                ($meta['status'] ?? '') === SubscriptionStatus::PastDue->value
                || $meta['stripe_failed']
                || (($meta['renews_in_window'] ?? false) && $ovUnits >= 3)
            );

            $rows[] = [
                'company_id' => $cid,
                'company_name' => Company::query()->whereKey($cid)->value('name'),
                'plan_allowance' => [
                    'included_collections' => $meta['included_collections'] ?? null,
                    'included_knife_allowance' => $meta['included_knife_allowance'] ?? null,
                ],
                'usage_units_in_period' => [
                    'covered_collections' => $usage['collections_included'],
                    'covered_knives' => $usage['knives_included'],
                    'overage_collections' => $usage['collections_overage'],
                    'overage_knives' => $usage['knives_overage'],
                ],
                'revenue_pence' => [
                    'subscription_line_items' => $subPence,
                    'formatted_subscription_line_items' => MoneyFormatting::formatGbpFromPence($subPence),
                    'overage_line_items' => $ovPence,
                    'formatted_overage_line_items' => MoneyFormatting::formatGbpFromPence($ovPence),
                    'combined_subscription_economy' => $rev,
                    'formatted_combined_subscription_economy' => MoneyFormatting::formatGbpFromPence($rev),
                ],
                'allocated_cost_pence' => $alloc,
                'formatted_allocated_cost' => MoneyFormatting::formatGbpFromPence($alloc),
                'gross_margin_estimate_pence' => $margin,
                'formatted_gross_margin_estimate' => MoneyFormatting::formatGbpFromPence($margin),
                'subscription_snapshot' => $meta !== null ? [
                    'subscription_id' => $meta['subscription_id'],
                    'status' => $meta['status'],
                    'renews_on' => $meta['renews_on'],
                    'plan_name' => $meta['plan_name'],
                ] : null,
                'flags' => [
                    'high_usage' => $highUsage,
                    'low_margin_estimate' => $lowMargin,
                    'churn_risk' => $churnRisk,
                ],
            ];
        }

        usort($rows, static function (array $a, array $b): int {
            return ($b['revenue_pence']['combined_subscription_economy'] ?? 0) <=> ($a['revenue_pence']['combined_subscription_economy'] ?? 0);
        });

        if ($scopedCompanyId !== null) {
            return array_values(array_filter($rows, static fn (array $r): bool => $r['company_id'] === $scopedCompanyId));
        }

        return array_slice($rows, 0, self::COMPANY_ROW_LIMIT);
    }

    /**
     * @param  list<string>  $companyIds
     * @return array<string, array{subscription_id: string, status: string, renews_on: ?string, plan_name: ?string, included_collections: ?int, included_knife_allowance: ?int, stripe_failed: bool, renews_in_window: bool}>
     */
    private function subscriptionMetaByCompany(array $companyIds, ?string $planId): array
    {
        if ($companyIds === []) {
            return [];
        }

        $now = CarbonImmutable::now();
        $windowEnd = $now->addDays(14)->toDateString();

        $subs = CompanySubscription::query()
            ->with('plan:id,name,included_collections,included_knife_allowance')
            ->whereIn('company_id', $companyIds)
            ->whereIn('status', [SubscriptionStatus::Active->value, SubscriptionStatus::PastDue->value])
            ->when($planId !== null, fn (Builder $q) => $q->where('subscription_plan_id', $planId))
            ->orderByDesc('starts_at')
            ->get();

        $map = [];

        foreach ($subs as $sub) {
            $cid = (string) $sub->company_id;
            if (isset($map[$cid])) {
                continue;
            }

            $plan = $sub->plan;
            $renews = $sub->renews_at?->toDateString();
            $map[$cid] = [
                'subscription_id' => (string) $sub->id,
                'status' => $sub->status instanceof SubscriptionStatus ? $sub->status->value : (string) $sub->status,
                'renews_on' => $renews,
                'plan_name' => $plan?->name,
                'included_collections' => $plan?->included_collections,
                'included_knife_allowance' => $plan?->included_knife_allowance,
                'stripe_failed' => $sub->stripe_last_payment_failed_at !== null,
                'renews_in_window' => $renews !== null && $renews <= $windowEnd && $renews >= $now->toDateString(),
            ];
        }

        return $map;
    }

    /**
     * @param  array<string, array{collections_included: int, knives_included: int, collections_overage: int, knives_overage: int, overage_implied_pence: int}>  $orderUsage
     * @return array{collections_included: int, knives_included: int, collections_overage: int, knives_overage: int}
     */
    private function sumCoveredOverageUnitsGlobal(array $orderUsage): array
    {
        $t = ['collections_included' => 0, 'knives_included' => 0, 'collections_overage' => 0, 'knives_overage' => 0];

        foreach ($orderUsage as $u) {
            $t['collections_included'] += $u['collections_included'];
            $t['knives_included'] += $u['knives_included'];
            $t['collections_overage'] += $u['collections_overage'];
            $t['knives_overage'] += $u['knives_overage'];
        }

        return $t;
    }
}
