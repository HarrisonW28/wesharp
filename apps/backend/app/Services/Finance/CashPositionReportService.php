<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Enums\CostFrequency;
use App\Enums\CostStatus;
use App\Enums\InvoiceStatus;
use App\Http\Requests\Admin\CashPositionReportRequest;
use App\Models\CostItem;
use App\Models\FinanceCashPositionSetting;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payment;
use App\Support\Money\MoneyFormatting;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

final class CashPositionReportService
{
    /** Approximate weeks per month for weekly burn derived from monthly equivalents (spreadsheet convention). */
    private const WEEKS_PER_MONTH = 4.33;

    public function __construct(
        private readonly RecurringRevenueMetricsService $recurringRevenueMetrics,
    ) {}

    /** @return array<string, mixed> */
    public function build(CashPositionReportRequest $request): array
    {
        $tz = config('app.timezone', 'UTC');
        $now = CarbonImmutable::now($tz);

        /** @var string|null $df */
        $df = $request->validated('date_from');
        /** @var string|null $dt */
        $dt = $request->validated('date_to');
        /** @var string|null $companyId */
        $companyId = $request->validated('company_id');

        $periodStart = $df !== null ? CarbonImmutable::parse($df, $tz)->startOfDay() : $now->startOfMonth();
        $periodEnd = $dt !== null ? CarbonImmutable::parse($dt, $tz)->endOfDay() : $now->endOfMonth();

        $settings = $this->singletonSettings();

        $purchasedSpendPence = $this->sumOneTimeByStatus(CostStatus::Purchased);
        $toOrderPence = $this->sumOneTimeByStatus(CostStatus::ToOrder);
        $pendingQuotePence = $this->sumOneTimeByStatus(CostStatus::PendingQuote);
        $deferredPence = $this->sumOneTimeByStatus(CostStatus::Deferred);
        $totalUpcomingOneTimePence = $toOrderPence + $pendingQuotePence + $deferredPence;

        $startingCapital = $settings->starting_capital_pence;
        $cashBufferPence = $startingCapital !== null ? $startingCapital - $purchasedSpendPence : null;
        $cashAfterImmediatePurchasesPence = $cashBufferPence !== null
            ? $cashBufferPence - $totalUpcomingOneTimePence
            : null;

        $burn = $this->recurringBurnBreakdown();
        $monthlyFixedPence = $burn['active_monthly_equivalent_pence'];
        $pendingMonthlyPence = $burn['pending_monthly_equivalent_pence'];
        $weeklyRunningPence = $monthlyFixedPence > 0
            ? (int) round($monthlyFixedPence / self::WEEKS_PER_MONTH)
            : 0;
        $totalMonthlyBurnPence = $monthlyFixedPence;

        $threshold = $settings->buffer_warning_threshold_pence;
        $warnings = $this->warnings(
            $cashBufferPence,
            $totalUpcomingOneTimePence,
            $totalMonthlyBurnPence,
            $threshold,
        );

        $runwayMonths = null;
        $runwayWeeks = null;
        if ($cashBufferPence !== null && $totalMonthlyBurnPence > 0) {
            $runwayMonths = round($cashBufferPence / $totalMonthlyBurnPence, 2);
        }
        if ($cashBufferPence !== null && $weeklyRunningPence > 0) {
            $runwayWeeks = round($cashBufferPence / $weeklyRunningPence, 2);
        }

        $profitabilitySlice = $this->profitabilitySlice($periodStart, $periodEnd, $companyId);

        return [
            'definitions' => [
                'purchased_spend' => 'Sum of amount_pence for one-time (frequency one_time) cost rows in status purchased; excludes cancelled/archived.',
                'cash_buffer' => 'Starting capital minus purchased spend (spreadsheet Cash Position buffer). Null starting capital yields null buffer.',
                'upcoming_one_time' => 'One-time rows in to_order, pending_quote, or deferred — pipeline cash still to deploy.',
                'cash_after_immediate_purchases' => 'Cash buffer minus total upcoming one-time pipeline (if buffer is known).',
                'monthly_fixed_costs' => 'Sum of monthly_equivalent_pence for recurring catalogue rows in active/purchased/reserve status (matches finance dashboard active recurring bucket).',
                'weekly_running_costs' => 'Monthly fixed costs divided by '.self::WEEKS_PER_MONTH.' (approximate weeks per month).',
                'total_monthly_burn' => 'Same as monthly fixed costs for Sprint 24.1 (committed recurring burn only). Pending recurring commitments are reported separately.',
                'runway' => 'Buffer divided by burn when burn > 0; null when burn is zero or buffer unknown.',
                'profitability_context' => 'Read-only activity and subscription snapshot for the selected period — does not alter cash buffer maths.',
            ],
            'filters_applied' => [
                'date_from' => $periodStart->toDateString(),
                'date_to' => $periodEnd->toDateString(),
                'company_id' => $companyId,
            ],
            'assumptions' => $this->assumptionsPayload($settings),
            'cash_position' => [
                'starting_capital_pence' => $startingCapital,
                'formatted_starting_capital' => $startingCapital !== null
                    ? MoneyFormatting::formatGbpFromPence($startingCapital)
                    : null,
                'purchased_spend_pence' => $purchasedSpendPence,
                'formatted_purchased_spend' => MoneyFormatting::formatGbpFromPence($purchasedSpendPence),
                'cash_buffer_pence' => $cashBufferPence,
                'formatted_cash_buffer' => $cashBufferPence !== null
                    ? MoneyFormatting::formatGbpFromPence($cashBufferPence)
                    : null,
                'upcoming_to_order_pence' => $toOrderPence,
                'formatted_upcoming_to_order' => MoneyFormatting::formatGbpFromPence($toOrderPence),
                'upcoming_pending_quote_pence' => $pendingQuotePence,
                'formatted_upcoming_pending_quote' => MoneyFormatting::formatGbpFromPence($pendingQuotePence),
                'upcoming_deferred_pence' => $deferredPence,
                'formatted_upcoming_deferred' => MoneyFormatting::formatGbpFromPence($deferredPence),
                'total_upcoming_one_time_pence' => $totalUpcomingOneTimePence,
                'formatted_total_upcoming_one_time' => MoneyFormatting::formatGbpFromPence($totalUpcomingOneTimePence),
                'cash_after_immediate_purchases_pence' => $cashAfterImmediatePurchasesPence,
                'formatted_cash_after_immediate_purchases' => $cashAfterImmediatePurchasesPence !== null
                    ? MoneyFormatting::formatGbpFromPence($cashAfterImmediatePurchasesPence)
                    : null,
                'weekly_running_costs_pence' => $weeklyRunningPence,
                'formatted_weekly_running_costs' => MoneyFormatting::formatGbpFromPence($weeklyRunningPence),
                'monthly_fixed_costs_pence' => $monthlyFixedPence,
                'formatted_monthly_fixed_costs' => MoneyFormatting::formatGbpFromPence($monthlyFixedPence),
                'pending_recurring_monthly_equivalent_pence' => $pendingMonthlyPence,
                'formatted_pending_recurring_monthly_equivalent' => MoneyFormatting::formatGbpFromPence($pendingMonthlyPence),
                'total_monthly_burn_pence' => $totalMonthlyBurnPence,
                'formatted_total_monthly_burn' => MoneyFormatting::formatGbpFromPence($totalMonthlyBurnPence),
                'runway_months' => $runwayMonths,
                'runway_weeks' => $runwayWeeks,
            ],
            'warnings' => $warnings,
            'profitability_context' => $profitabilitySlice,
        ];
    }

    /** @return array<string, mixed> */
    public function assumptionsResponse(FinanceCashPositionSetting $settings): array
    {
        return $this->assumptionsPayload($settings);
    }

    private function singletonSettings(): FinanceCashPositionSetting
    {
        return FinanceCashPositionSetting::query()->firstOrCreate(['id' => 1]);
    }

    private function sumOneTimeByStatus(CostStatus $status): int
    {
        return (int) $this->baseCostQuery()
            ->where('frequency', CostFrequency::OneTime)
            ->where('status', $status)
            ->sum('amount_pence');
    }

    /** @return Builder<CostItem> */
    private function baseCostQuery(): Builder
    {
        return CostItem::query()->whereNotIn('status', [
            CostStatus::Cancelled,
            CostStatus::Archived,
        ]);
    }

    /** @return array{active_monthly_equivalent_pence: int, pending_monthly_equivalent_pence: int} */
    private function recurringBurnBreakdown(): array
    {
        $items = CostItem::query()
            ->where('is_recurring', true)
            ->whereNotIn('status', [
                CostStatus::Cancelled,
                CostStatus::Archived,
            ])
            ->get();

        $activeMonthly = 0;
        $pendingMonthly = 0;

        foreach ($items as $item) {
            $mp = (int) ($item->monthly_equivalent_pence ?? 0);
            $st = $item->status;
            if ($st->isActiveRecurringCommitmentBucket()) {
                $activeMonthly += $mp;
            } elseif ($st->isPendingRecurringCommitmentBucket()) {
                $pendingMonthly += $mp;
            }
        }

        return [
            'active_monthly_equivalent_pence' => $activeMonthly,
            'pending_monthly_equivalent_pence' => $pendingMonthly,
        ];
    }

    /**
     * @return list<array{code: string, message: string}>
     */
    private function warnings(
        ?int $cashBufferPence,
        int $totalUpcomingOneTimePence,
        int $totalMonthlyBurnPence,
        ?int $thresholdPence,
    ): array {
        $warnings = [];

        if ($thresholdPence !== null && $cashBufferPence !== null && $cashBufferPence < $thresholdPence) {
            $warnings[] = [
                'code' => 'buffer_below_threshold',
                'message' => 'Cash buffer is below the configured warning threshold.',
            ];
        }

        if ($cashBufferPence !== null && $totalUpcomingOneTimePence > $cashBufferPence) {
            $warnings[] = [
                'code' => 'upcoming_one_time_exceeds_buffer',
                'message' => 'Total upcoming one-time pipeline exceeds the live cash buffer.',
            ];
        }

        if ($totalMonthlyBurnPence > 0 && $cashBufferPence !== null && $cashBufferPence <= 0) {
            $warnings[] = [
                'code' => 'burn_with_non_positive_buffer',
                'message' => 'Committed monthly burn is positive while the cash buffer is zero or negative.',
            ];
        }

        return $warnings;
    }

    /** @return array<string, mixed> */
    private function assumptionsPayload(FinanceCashPositionSetting $settings): array
    {
        return [
            'starting_capital_pence' => $settings->starting_capital_pence,
            'formatted_starting_capital' => $settings->starting_capital_pence !== null
                ? MoneyFormatting::formatGbpFromPence((int) $settings->starting_capital_pence)
                : null,
            'regular_route_price_per_knife_pence' => $settings->regular_route_price_per_knife_pence,
            'formatted_regular_route_price_per_knife' => $settings->regular_route_price_per_knife_pence !== null
                ? MoneyFormatting::formatGbpFromPence((int) $settings->regular_route_price_per_knife_pence)
                : null,
            'trial_price_per_knife_pence' => $settings->trial_price_per_knife_pence,
            'formatted_trial_price_per_knife' => $settings->trial_price_per_knife_pence !== null
                ? MoneyFormatting::formatGbpFromPence((int) $settings->trial_price_per_knife_pence)
                : null,
            'route_days_per_week' => $settings->route_days_per_week !== null
                ? (string) $settings->route_days_per_week
                : null,
            'buffer_warning_threshold_pence' => $settings->buffer_warning_threshold_pence,
            'formatted_buffer_warning_threshold' => $settings->buffer_warning_threshold_pence !== null
                ? MoneyFormatting::formatGbpFromPence((int) $settings->buffer_warning_threshold_pence)
                : null,
            'conversion_target_price_pence' => $settings->conversion_target_price_pence,
            'formatted_conversion_target_price' => $settings->conversion_target_price_pence !== null
                ? MoneyFormatting::formatGbpFromPence((int) $settings->conversion_target_price_pence)
                : null,
            'second_machine_trigger_pence' => $settings->second_machine_trigger_pence,
            'formatted_second_machine_trigger' => $settings->second_machine_trigger_pence !== null
                ? MoneyFormatting::formatGbpFromPence((int) $settings->second_machine_trigger_pence)
                : null,
            'van_assessment_trigger_pence' => $settings->van_assessment_trigger_pence,
            'formatted_van_assessment_trigger' => $settings->van_assessment_trigger_pence !== null
                ? MoneyFormatting::formatGbpFromPence((int) $settings->van_assessment_trigger_pence)
                : null,
            'updated_at' => $settings->updated_at?->toIso8601String(),
            'updated_by_user_id' => $settings->updated_by_user_id,
        ];
    }

    /** @return array<string, mixed> */
    private function profitabilitySlice(
        CarbonImmutable $periodStart,
        CarbonImmutable $periodEnd,
        ?string $companyId,
    ): array {
        $paymentBase = Payment::query()
            ->whereBetween('paid_at', [$periodStart, $periodEnd])
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId))
            ->where(function (Builder $q): void {
                $q->whereNull('invoice_id')
                    ->orWhereHas('invoice', fn (Builder $iq) => $iq->where('invoice_status', '!=', InvoiceStatus::Void->value));
            });

        $paidInPeriodPence = (int) (clone $paymentBase)->sum('amount_pence');
        $paymentCountInPeriod = (int) (clone $paymentBase)->count();

        $subscriptionPaymentsPence = (int) Payment::query()
            ->whereBetween('paid_at', [$periodStart, $periodEnd])
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId))
            ->whereHas('invoice', function (Builder $iq): void {
                $iq->where('is_subscription_billing', true)
                    ->where('invoice_status', '!=', InvoiceStatus::Void->value);
            })
            ->sum('amount_pence');

        $issuedBase = Invoice::query()
            ->whereBetween('issued_on', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->whereNotIn('invoice_status', [InvoiceStatus::Draft, InvoiceStatus::Void])
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId));

        $invoicesIssuedPence = (int) (clone $issuedBase)->sum('total_pence');

        $ordersCompleted = Order::query()
            ->completed()
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId))
            ->whereBetween('completed_at', [$periodStart, $periodEnd]);

        $completedOrderCount = (int) (clone $ordersCompleted)->count();
        $completedOrderRevenuePence = (int) (clone $ordersCompleted)->sum('total_pence');

        $recurring = $this->recurringRevenueMetrics->build($periodStart, $periodEnd, $companyId);

        return [
            'paid_in_period_pence' => $paidInPeriodPence,
            'formatted_paid_in_period' => MoneyFormatting::formatGbpFromPence($paidInPeriodPence),
            'payment_count_in_period' => $paymentCountInPeriod,
            'subscription_tagged_payments_in_period_pence' => $subscriptionPaymentsPence,
            'formatted_subscription_tagged_payments_in_period' => MoneyFormatting::formatGbpFromPence($subscriptionPaymentsPence),
            'invoices_issued_in_period_pence' => $invoicesIssuedPence,
            'formatted_invoices_issued_in_period' => MoneyFormatting::formatGbpFromPence($invoicesIssuedPence),
            'orders_completed_in_period_count' => $completedOrderCount,
            'orders_completed_revenue_in_period_pence' => $completedOrderRevenuePence,
            'formatted_orders_completed_revenue_in_period' => MoneyFormatting::formatGbpFromPence($completedOrderRevenuePence),
            'recurring_revenue_snapshot' => [
                'mrr' => $recurring['mrr'],
                'arr' => $recurring['arr'],
                'subscription_counts' => $recurring['subscription_counts'],
                'revenue_invoiced_period_pence' => $recurring['revenue_invoiced_period_pence'],
                'revenue_payments_period_pence' => $recurring['revenue_payments_period_pence'],
            ],
        ];
    }
}
