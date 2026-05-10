<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Data\Reports\AdminReportFilters;
use App\Enums\InvoiceStatus;
use App\Enums\StripeCheckoutAttemptStatus;
use App\Http\Requests\Admin\CashPositionReportRequest;
use App\Http\Requests\Admin\ExecutiveFinanceDashboardRequest;
use App\Http\Requests\Admin\FinanceDashboardRequest;
use App\Http\Requests\Admin\SubscriptionProfitabilityReportRequest;
use App\Models\Booking;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\StripeCheckoutAttempt;
use App\Support\Money\MoneyFormatting;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Sprint 24.6 — executive owner snapshot composing cash, subscriptions, routes, finance KPIs and alerts.
 */
final class ExecutiveFinanceDashboardService
{
    public function __construct(
        private readonly CashPositionReportService $cashPositionReportService,
        private readonly FinanceDashboardService $financeDashboardService,
        private readonly SubscriptionProfitabilityReportService $subscriptionProfitabilityReportService,
        private readonly RouteProfitabilityReportService $routeProfitabilityReportService,
    ) {}

    /** @return array<string, mixed> */
    public function build(ExecutiveFinanceDashboardRequest $request): array
    {
        $tz = config('app.timezone', 'UTC');
        $now = CarbonImmutable::now($tz);

        /** @var string|null $companyId */
        $companyId = $request->validated('company_id');

        $todayStart = $now->startOfDay();
        $todayEnd = $now->endOfDay();
        $weekStart = $now->startOfWeek()->startOfDay();
        $weekEnd = $now->endOfWeek()->endOfDay();
        $monthStart = $now->startOfMonth()->startOfDay();
        $monthEnd = $now->endOfMonth()->endOfDay();

        $prevMonthStart = $monthStart->subMonthNoOverflow()->startOfMonth();
        $prevMonthEnd = $monthStart->subMonthNoOverflow()->endOfMonth();

        $periods = [
            'today' => [
                'date_from' => $todayStart->toDateString(),
                'date_to' => $todayEnd->toDateString(),
            ],
            'this_week' => [
                'date_from' => $weekStart->toDateString(),
                'date_to' => $weekEnd->toDateString(),
            ],
            'this_month' => [
                'date_from' => $monthStart->toDateString(),
                'date_to' => $monthEnd->toDateString(),
            ],
        ];

        $activityToday = $this->activityCounts($todayStart, $todayEnd, $companyId);
        $activityWeek = $this->activityCounts($weekStart, $weekEnd, $companyId);
        $activityMonth = $this->activityCounts($monthStart, $monthEnd, $companyId);

        $cashPayload = $this->cashPositionReportService->build($this->cashPositionRequest($companyId, $monthStart, $monthEnd));
        $cashPosition = is_array($cashPayload['cash_position'] ?? null) ? $cashPayload['cash_position'] : [];
        $cashWarnings = is_array($cashPayload['warnings'] ?? null) ? $cashPayload['warnings'] : [];

        $financeMonth = $this->financeDashboardService->build($this->financeDashboardRequest($companyId, $monthStart, $monthEnd));
        $financeKpis = is_array($financeMonth['kpis'] ?? null) ? $financeMonth['kpis'] : [];
        $consumables = is_array($financeMonth['consumables_inventory'] ?? null) ? $financeMonth['consumables_inventory'] : [];
        $costCommitments = is_array($financeMonth['cost_commitments'] ?? null) ? $financeMonth['cost_commitments'] : [];

        $subProfit = $this->subscriptionProfitabilityReportService->build($this->subscriptionProfitabilityRequest($companyId, $monthStart, $monthEnd));
        $subKpis = is_array($subProfit['kpis'] ?? null) ? $subProfit['kpis'] : [];
        $subFlags = is_array($subProfit['flags'] ?? null) ? $subProfit['flags'] : [];
        $recurringCtx = is_array($subProfit['recurring_revenue_context'] ?? null) ? $subProfit['recurring_revenue_context'] : [];

        $routeFilters = new AdminReportFilters(
            $monthStart,
            $monthEnd,
            null,
            null,
            $companyId,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            500,
            1,
        );
        $routeReport = $this->routeProfitabilityReportService->build($routeFilters);
        $routeKpis = is_array($routeReport['kpis'] ?? null) ? $routeReport['kpis'] : [];

        $paidMonthPence = (int) ($financeKpis['paid_in_period_pence'] ?? 0);
        $routeMarginPence = (int) ($routeKpis['total_route_margin_pence'] ?? 0);
        $routeRevPence = (int) ($routeKpis['total_route_revenue_pence'] ?? 0);
        $routeAllocPence = (int) ($routeKpis['total_allocated_cost_pence'] ?? 0);
        $subMarginPence = (int) ($subKpis['subscription_margin_estimate_period_pence'] ?? 0);

        $monthlyBurnPence = (int) ($cashPosition['total_monthly_burn_pence'] ?? 0);
        $grossProfitEstimatePence = $routeMarginPence + $subMarginPence;
        $netProfitRoughPence = $grossProfitEstimatePence - $monthlyBurnPence;

        $completedOrdersMonth = Order::query()
            ->completed()
            ->when($companyId !== null, fn ($q) => $q->where('company_id', $companyId))
            ->whereBetween('completed_at', [$monthStart, $monthEnd]);

        $completedOrderCountMonth = (int) (clone $completedOrdersMonth)->count();
        $knivesCompletedMonth = (int) (clone $completedOrdersMonth)->sum('knife_count');
        $completedRevenueMonth = (int) (clone $completedOrdersMonth)->sum('total_pence');

        $avgOrderValuePence = $completedOrderCountMonth > 0
            ? (int) round($completedRevenueMonth / $completedOrderCountMonth)
            : 0;
        $profitPerKnifePence = $knivesCompletedMonth > 0
            ? (int) round($netProfitRoughPence / $knivesCompletedMonth)
            : 0;
        $costPerKnifePence = $knivesCompletedMonth > 0
            ? (int) round($routeAllocPence / max(1, $knivesCompletedMonth))
            : 0;

        $mrrBlock = is_array($recurringCtx['mrr'] ?? null) ? $recurringCtx['mrr'] : [];
        $mrrPence = (int) ($mrrBlock['value_pence'] ?? 0);
        $formattedMrrFromCtx = isset($mrrBlock['formatted_gbp']) && is_string($mrrBlock['formatted_gbp'])
            ? $mrrBlock['formatted_gbp']
            : MoneyFormatting::formatGbpFromPence($mrrPence);

        $subscriptionCounts = is_array($recurringCtx['subscription_counts'] ?? null) ? $recurringCtx['subscription_counts'] : [];
        $activeSubs = (int) ($subscriptionCounts['active'] ?? 0);

        $runwayWeeks = $cashPosition['runway_weeks'] ?? null;
        $runwayMonths = $cashPosition['runway_months'] ?? null;

        $investedOrCommittedPence = (int) ($cashPosition['purchased_spend_pence'] ?? 0)
            + (int) ($cashPosition['total_upcoming_one_time_pence'] ?? 0);
        $roiRatio = $investedOrCommittedPence > 0
            ? round($paidMonthPence / $investedOrCommittedPence, 4)
            : null;

        $secondMachinePence = $this->secondMachineTriggerPence($cashPayload);
        $equipmentPaybackNote = null;
        if ($secondMachinePence !== null && $investedOrCommittedPence >= $secondMachinePence) {
            $equipmentPaybackNote = 'Aggregate purchased + pipeline spend meets or exceeds the configured second-machine trigger — review capex assumptions.';
        }

        $expiredCheckoutMonth = $this->expiredCheckoutCount($monthStart, $monthEnd);
        $expiredCheckoutPrev = $this->expiredCheckoutCount($prevMonthStart, $prevMonthEnd);

        $alerts = $this->buildAlerts(
            $cashWarnings,
            $cashPosition,
            $financeKpis,
            $consumables,
            $costCommitments,
            $subKpis,
            $subFlags,
            $routeKpis,
            $expiredCheckoutMonth,
            $expiredCheckoutPrev,
            $secondMachinePence,
            $investedOrCommittedPence,
            $runwayWeeks,
        );

        return [
            'definitions' => [
                'purpose' => 'Sprint 24.6 executive snapshot — blends operational ledger signals; not statutory accounts.',
                'gross_profit_estimate' => 'Route margin (month) + subscription portfolio margin estimate (month).',
                'net_profit_rough' => 'Gross profit estimate minus catalogue monthly burn from cash position.',
                'roi_ratio' => 'Cash payments collected in month ÷ (purchased spend + upcoming one-time pipeline) — cash-on-cash proxy, not IRR.',
                'equipment_payback' => 'Flags when purchased + pipeline spend crosses the second-machine assumption threshold.',
            ],
            'filters_applied' => [
                'company_id' => $companyId,
                'timezone' => (string) $tz,
            ],
            'periods' => $periods,
            'sections' => [
                'today' => $activityToday,
                'this_week' => $activityWeek,
                'this_month' => $activityMonth,
            ],
            'kpis' => [
                'revenue_this_month_pence' => $paidMonthPence,
                'formatted_revenue_this_month' => MoneyFormatting::formatGbpFromPence($paidMonthPence),
                'revenue_this_month_href' => '/admin/reports/billing',

                'gross_profit_estimate_month_pence' => $grossProfitEstimatePence,
                'formatted_gross_profit_estimate_month' => MoneyFormatting::formatGbpFromPence($grossProfitEstimatePence),
                'gross_profit_href' => '/admin/reports/subscription-profitability',

                'net_profit_estimate_month_pence' => $netProfitRoughPence,
                'formatted_net_profit_estimate_month' => MoneyFormatting::formatGbpFromPence($netProfitRoughPence),
                'net_profit_note' => 'Rough: gross estimate minus recurring monthly burn — excludes timing and non-cash items.',

                'cash_buffer_pence' => $cashPosition['cash_buffer_pence'] ?? null,
                'formatted_cash_buffer' => $cashPosition['formatted_cash_buffer'] ?? null,
                'cash_href' => '/admin/reports/cash-position',

                'runway_weeks' => $runwayWeeks,
                'runway_months' => $runwayMonths,
                'formatted_runway_weeks' => $runwayWeeks !== null ? (string) $runwayWeeks.' wk' : null,
                'formatted_runway_months' => $runwayMonths !== null ? (string) $runwayMonths.' mo' : null,

                'recurring_costs_monthly_pence' => $monthlyBurnPence,
                'formatted_recurring_costs_monthly' => MoneyFormatting::formatGbpFromPence($monthlyBurnPence),
                'recurring_costs_href' => '/admin/finance/cost-ledger',

                'mrr_pence' => $mrrPence,
                'formatted_mrr' => $formattedMrrFromCtx,
                'mrr_href' => '/admin/reports/recurring-revenue',

                'overdue_invoices_count' => (int) ($financeKpis['overdue_invoice_count'] ?? 0),
                'formatted_outstanding_debt' => (string) ($financeKpis['formatted_outstanding'] ?? MoneyFormatting::formatGbpFromPence(0)),
                'outstanding_pence' => (int) ($financeKpis['outstanding_pence'] ?? 0),
                'overdue_href' => '/admin/finance',

                'active_subscriptions_count' => $activeSubs,
                'subscriptions_href' => '/admin/subscriptions',

                'route_margin_month_pence' => $routeMarginPence,
                'formatted_route_margin_month' => MoneyFormatting::formatGbpFromPence($routeMarginPence),
                'route_margin_href' => '/admin/reports/route-profitability',

                'average_order_value_pence' => $avgOrderValuePence,
                'formatted_average_order_value' => MoneyFormatting::formatGbpFromPence($avgOrderValuePence),

                'profit_per_knife_pence' => $profitPerKnifePence,
                'formatted_profit_per_knife' => MoneyFormatting::formatGbpFromPence($profitPerKnifePence),
                'profit_per_knife_note' => 'Uses rough net profit ÷ completed knives in month.',

                'cost_per_knife_pence' => $costPerKnifePence,
                'formatted_cost_per_knife' => MoneyFormatting::formatGbpFromPence($costPerKnifePence),
                'cost_per_knife_note' => 'Route allocated cost (month) ÷ completed knives — illustrative.',

                'roi_cash_proxy_ratio' => $roiRatio,
                'formatted_roi_cash_proxy' => $roiRatio !== null ? (string) round($roiRatio * 100, 2).'%' : null,

                'equipment_payback_flag' => $equipmentPaybackNote !== null,
                'equipment_payback_note' => $equipmentPaybackNote,

                'invoices_issued_month_count' => $this->invoicesIssuedCount($monthStart, $monthEnd, $companyId),

                'route_revenue_month_pence' => $routeRevPence,
                'formatted_route_revenue_month' => MoneyFormatting::formatGbpFromPence($routeRevPence),

                'customer_growth_month' => $this->companiesCreatedCount($monthStart, $monthEnd),
                'customer_growth_href' => '/admin/crm',
            ],
            'forecast_links' => [
                ['title' => 'Forecast scenarios', 'href' => '/admin/reports/forecast-scenarios', 'description' => 'Model routes, pricing and payback buckets.'],
                ['title' => 'Cash position workbook', 'href' => '/admin/reports/cash-position', 'description' => 'Buffer, burn and runway detail.'],
                ['title' => 'Subscription profitability', 'href' => '/admin/reports/subscription-profitability', 'description' => 'MRR context, overage and margin flags.'],
            ],
            'alerts' => $alerts,
            'disclaimer' => 'Executive KPIs combine estimates from multiple reports. Drill into linked reports before operational or investor decisions.',
        ];
    }

    /**
     * @return array{bookings_created: int, orders_created: int, invoices_issued: int}
     */
    private function activityCounts(CarbonImmutable $from, CarbonImmutable $to, ?string $companyId): array
    {
        $bookings = (int) Booking::query()
            ->when($companyId !== null, fn ($q) => $q->where('company_id', $companyId))
            ->whereBetween('created_at', [$from, $to])
            ->count();

        $orders = (int) Order::query()
            ->when($companyId !== null, fn ($q) => $q->where('company_id', $companyId))
            ->whereBetween('created_at', [$from, $to])
            ->count();

        $invoices = (int) Invoice::query()
            ->whereNotIn('invoice_status', [InvoiceStatus::Draft, InvoiceStatus::Void])
            ->when($companyId !== null, fn ($q) => $q->where('company_id', $companyId))
            ->whereBetween('issued_on', [$from->toDateString(), $to->toDateString()])
            ->count();

        return [
            'bookings_created' => $bookings,
            'orders_created' => $orders,
            'invoices_issued' => $invoices,
        ];
    }

    private function invoicesIssuedCount(CarbonImmutable $from, CarbonImmutable $to, ?string $companyId): int
    {
        return (int) Invoice::query()
            ->whereNotIn('invoice_status', [InvoiceStatus::Draft, InvoiceStatus::Void])
            ->when($companyId !== null, fn ($q) => $q->where('company_id', $companyId))
            ->whereBetween('issued_on', [$from->toDateString(), $to->toDateString()])
            ->count();
    }

    private function companiesCreatedCount(CarbonImmutable $from, CarbonImmutable $to): int
    {
        return (int) Company::query()
            ->whereBetween('created_at', [$from, $to])
            ->count();
    }

    private function expiredCheckoutCount(CarbonImmutable $from, CarbonImmutable $to): int
    {
        return (int) StripeCheckoutAttempt::query()
            ->where('status', StripeCheckoutAttemptStatus::Expired)
            ->whereBetween('created_at', [$from, $to])
            ->count();
    }

    /** @param  array<string, mixed>  $cashPayload */
    private function secondMachineTriggerPence(array $cashPayload): ?int
    {
        $assumptions = $cashPayload['assumptions'] ?? null;
        if (! is_array($assumptions)) {
            return null;
        }
        $p = $assumptions['second_machine_trigger_pence'] ?? null;

        return is_numeric($p) ? (int) $p : null;
    }

    /**
     * @param  array<string, mixed>  $cashWarnings
     * @param  array<string, mixed>  $cashPosition
     * @param  array<string, mixed>  $financeKpis
     * @param  array<string, mixed>  $consumables
     * @param  array<string, mixed>  $costCommitments
     * @param  array<string, mixed>  $subKpis
     * @param  array<string, mixed>  $subFlags
     * @param  array<string, mixed>  $routeKpis
     * @return list<array{severity: string, code: string, message: string, href: string|null, cta: string|null}>
     */
    private function buildAlerts(
        array $cashWarnings,
        array $cashPosition,
        array $financeKpis,
        array $consumables,
        array $costCommitments,
        array $subKpis,
        array $subFlags,
        array $routeKpis,
        int $expiredCheckoutMonth,
        int $expiredCheckoutPrev,
        ?int $secondMachinePence,
        int $investedOrCommittedPence,
        mixed $runwayWeeks,
    ): array {
        $out = [];

        foreach ($cashWarnings as $w) {
            if (! is_array($w)) {
                continue;
            }
            $code = (string) ($w['code'] ?? 'cash_warning');
            $msg = (string) ($w['message'] ?? 'Cash position warning.');
            $out[] = [
                'severity' => 'danger',
                'code' => $code,
                'message' => $msg,
                'href' => '/admin/reports/cash-position',
                'cta' => 'Cash position',
            ];
        }

        $overdue = (int) ($financeKpis['overdue_invoice_count'] ?? 0);
        if ($overdue > 0) {
            $out[] = [
                'severity' => 'warning',
                'code' => 'overdue_invoices',
                'message' => "{$overdue} overdue invoice(s) — chase collections.",
                'href' => '/admin/finance',
                'cta' => 'Finance overview',
            ];
        }

        $lowStock = (int) ($consumables['low_stock_count'] ?? 0);
        if ($lowStock > 0) {
            $out[] = [
                'severity' => 'warning',
                'code' => 'consumables_low_stock',
                'message' => "{$lowStock} consumable SKU(s) at or below reorder threshold.",
                'href' => '/admin/finance/consumables',
                'cta' => 'Consumables',
            ];
        }

        $activeMonthly = (int) ($costCommitments['monthly_equivalent_active_pence'] ?? 0);
        $pendingMonthly = (int) ($costCommitments['monthly_equivalent_pending_pence'] ?? 0);
        if ($activeMonthly > 0 && $pendingMonthly > (int) round($activeMonthly * 0.25) && $pendingMonthly > 50_000) {
            $out[] = [
                'severity' => 'warning',
                'code' => 'recurring_commitments_rising',
                'message' => 'Pending recurring commitments are elevated versus active commitments.',
                'href' => '/admin/finance/costs',
                'cta' => 'Cost catalogue',
            ];
        }

        $failedSubs = (int) ($subKpis['failed_payment_subscriptions_count'] ?? 0);
        if ($failedSubs > 0) {
            $out[] = [
                'severity' => 'danger',
                'code' => 'subscription_payment_failures',
                'message' => "{$failedSubs} subscription(s) with failed payments.",
                'href' => '/admin/reports/subscription-profitability',
                'cta' => 'Subscription profitability',
            ];
        }

        $overageKnives = (int) ($subKpis['overage_knife_units_in_period'] ?? 0);
        $overageCols = (int) ($subKpis['overage_collection_units_in_period'] ?? 0);
        if ($overageKnives + $overageCols > 10) {
            $out[] = [
                'severity' => 'info',
                'code' => 'subscription_overage_usage',
                'message' => 'Subscription overage units are elevated this month — review allowances.',
                'href' => '/admin/reports/subscription-profitability',
                'cta' => 'Subscription profitability',
            ];
        }

        $lowMargin = is_array($subFlags['low_margin_subscription_customers'] ?? null) ? $subFlags['low_margin_subscription_customers'] : [];
        if (count($lowMargin) > 0) {
            $out[] = [
                'severity' => 'warning',
                'code' => 'low_margin_customers',
                'message' => count($lowMargin).' subscription customer(s) flagged low margin.',
                'href' => '/admin/reports/subscription-profitability',
                'cta' => 'Subscription profitability',
            ];
        }

        $routeMargin = (int) ($routeKpis['total_route_margin_pence'] ?? 0);
        if ($routeMargin < 0) {
            $out[] = [
                'severity' => 'warning',
                'code' => 'route_margin_negative',
                'message' => 'Aggregate route margin for the month is negative.',
                'href' => '/admin/reports/route-profitability',
                'cta' => 'Route profitability',
            ];
        }

        if ($runwayWeeks !== null && is_numeric($runwayWeeks) && (float) $runwayWeeks > 0 && (float) $runwayWeeks < 4.0) {
            $out[] = [
                'severity' => 'danger',
                'code' => 'runway_short',
                'message' => 'Runway under four weeks at current burn.',
                'href' => '/admin/reports/cash-position',
                'cta' => 'Cash position',
            ];
        }

        if ($secondMachinePence !== null && $investedOrCommittedPence >= $secondMachinePence) {
            $out[] = [
                'severity' => 'info',
                'code' => 'equipment_threshold_crossed',
                'message' => 'Purchased + pipeline spend crossed the second-machine trigger assumption.',
                'href' => '/admin/reports/cash-position',
                'cta' => 'Assumptions',
            ];
        }

        if ($expiredCheckoutPrev > 0 && $expiredCheckoutMonth > (int) round($expiredCheckoutPrev * 1.5)) {
            $out[] = [
                'severity' => 'warning',
                'code' => 'abandoned_checkouts_rising',
                'message' => 'Expired invoice checkouts jumped versus last month.',
                'href' => '/admin/reports/sales-performance',
                'cta' => 'Sales & POS performance',
            ];
        }

        $unique = [];
        foreach ($out as $row) {
            $unique[$row['code']] = $row;
        }

        return array_values($unique);
    }

    private function cashPositionRequest(?string $companyId, CarbonImmutable $from, CarbonImmutable $to): CashPositionReportRequest
    {
        $query = array_filter([
            'date_from' => $from->toDateString(),
            'date_to' => $to->toDateString(),
            'company_id' => $companyId,
        ], static fn ($v) => $v !== null && $v !== '');

        return $this->hydrateFormRequest(CashPositionReportRequest::class, $query);
    }

    private function financeDashboardRequest(?string $companyId, CarbonImmutable $from, CarbonImmutable $to): FinanceDashboardRequest
    {
        $query = array_filter([
            'date_from' => $from->toDateString(),
            'date_to' => $to->toDateString(),
            'company_id' => $companyId,
        ], static fn ($v) => $v !== null && $v !== '');

        return $this->hydrateFormRequest(FinanceDashboardRequest::class, $query);
    }

    private function subscriptionProfitabilityRequest(?string $companyId, CarbonImmutable $from, CarbonImmutable $to): SubscriptionProfitabilityReportRequest
    {
        $query = array_filter([
            'date_from' => $from->toDateString(),
            'date_to' => $to->toDateString(),
            'company_id' => $companyId,
        ], static fn ($v) => $v !== null && $v !== '');

        return $this->hydrateFormRequest(SubscriptionProfitabilityReportRequest::class, $query);
    }

    /**
     * @param  class-string<T>  $class
     * @param  array<string, scalar|null>  $query
     * @return T
     *
     * @template T of \Illuminate\Foundation\Http\FormRequest
     */
    private function hydrateFormRequest(string $class, array $query): mixed
    {
        $base = Request::create('/', 'GET', $query);
        /** @var FormRequest $form */
        $form = $class::createFrom($base);
        $form->setContainer(app());
        $form->setRedirector(app('redirect'));
        if ($user = Auth::user()) {
            $form->setUserResolver(static fn () => $user);
        }
        $form->validateResolved();

        return $form;
    }
}
