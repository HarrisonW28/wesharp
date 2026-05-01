<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Enums\BillingInterval;
use App\Enums\InvoiceLineItemType;
use App\Enums\InvoiceStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Support\Money\MoneyFormatting;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/**
 * Subscription / recurring visibility from real {@see CompanySubscription} and invoice flags only.
 * MRR/ARR use active monthly subscription price snapshots; see `mrr.reason` when not computable.
 */
final class RecurringRevenueMetricsService
{
    private const PLACEHOLDER = 'Subscription reporting uses catalogue plans and company snapshots. MRR sums active monthly subscriptions only (see mrr.reason when empty).';

    /** @return array<string, mixed> */
    public function build(
        CarbonImmutable $periodStart,
        CarbonImmutable $periodEnd,
        ?string $companyId,
        ?string $planId = null,
        ?string $subscriptionStatus = null,
    ): array {
        $tz = $periodStart->timezone->getName();
        $asOfDate = $periodEnd->toDateString();

        $subBase = CompanySubscription::query()
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId))
            ->when($planId !== null, fn (Builder $q) => $q->where('subscription_plan_id', $planId))
            ->when($subscriptionStatus !== null, fn (Builder $q) => $q->where('status', $subscriptionStatus));

        $hasSubscriptionRows = (clone $subBase)->exists();

        $activeSubscriptions = (int) (clone $subBase)->where('status', 'active')->count();
        $cancelledSubscriptionsSnapshot = (int) (clone $subBase)->where('status', 'cancelled')->count();
        $newSubscriptionsInPeriod = (int) (clone $subBase)
            ->whereBetween('created_at', [$periodStart, $periodEnd])
            ->count();
        $cancelledSubscriptionsInPeriod = (int) (clone $subBase)
            ->where('status', 'cancelled')
            ->whereBetween('updated_at', [$periodStart, $periodEnd])
            ->count();

        $invoiceRecurringBase = $this->invoicesIssuedInPeriod($periodStart, $periodEnd, $companyId)
            ->where('is_subscription_billing', true);

        $invoiceOneOffBase = $this->invoicesIssuedInPeriod($periodStart, $periodEnd, $companyId)
            ->where(function (Builder $q): void {
                $q->where('is_subscription_billing', false)->orWhereNull('is_subscription_billing');
            });

        $subscriptionInvoicedPence = (int) (clone $invoiceRecurringBase)->sum('total_pence');
        $oneOffInvoicedPence = (int) (clone $invoiceOneOffBase)->sum('total_pence');
        $invoicedTotalPence = $subscriptionInvoicedPence + $oneOffInvoicedPence;
        $recurringShare = $invoicedTotalPence > 0
            ? round($subscriptionInvoicedPence / $invoicedTotalPence, 4)
            : null;

        $subscriptionPaymentsPence = (int) Payment::query()
            ->whereBetween('paid_at', [$periodStart, $periodEnd])
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId))
            ->whereHas('invoice', function (Builder $iq): void {
                $iq->where('is_subscription_billing', true)
                    ->where('invoice_status', '!=', InvoiceStatus::Void->value);
            })
            ->sum('amount_pence');

        $oneOffPaymentsPence = (int) Payment::query()
            ->whereBetween('paid_at', [$periodStart, $periodEnd])
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId))
            ->whereHas('invoice', function (Builder $iq): void {
                $iq->where(function (Builder $q2): void {
                    $q2->where('is_subscription_billing', false)->orWhereNull('is_subscription_billing');
                })
                    ->where('invoice_status', '!=', InvoiceStatus::Void->value);
            })
            ->sum('amount_pence');

        $mrrMonthlyPence = (int) CompanySubscription::query()
            ->where('status', SubscriptionStatus::Active->value)
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId))
            ->when($planId !== null, fn (Builder $q) => $q->where('subscription_plan_id', $planId))
            ->whereHas('plan', fn (Builder $q) => $q->where('billing_interval', BillingInterval::Monthly->value))
            ->sum('price_amount_minor_snapshot');

        $mrrComputable = $mrrMonthlyPence > 0;
        $arrPence = $mrrComputable ? $mrrMonthlyPence * 12 : null;

        $upcomingRenewals = CompanySubscription::query()
            ->with(['company:id,name', 'plan:id,name'])
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId))
            ->when($planId !== null, fn (Builder $q) => $q->where('subscription_plan_id', $planId))
            ->when($subscriptionStatus !== null, fn (Builder $q) => $q->where('status', $subscriptionStatus))
            ->whereNotNull('renews_at')
            ->whereBetween('renews_at', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->orderBy('renews_at')
            ->limit(50)
            ->get()
            ->map(fn (CompanySubscription $s): array => [
                'company_id' => (string) $s->company_id,
                'company_name' => $s->relationLoaded('company') && $s->company !== null ? $s->company->name : null,
                'plan_name' => $s->plan?->name ?? '',
                'status' => $s->status?->value ?? (string) $s->status,
                'renews_on' => $s->renews_at?->format('Y-m-d'),
            ])
            ->values()
            ->all();

        $overdueSubscriptionInvoices = $this->overdueSubscriptionInvoiceCount($companyId, $asOfDate);

        $topSubscriptionCustomers = $this->topSubscriptionCustomersByInvoicedPeriod(
            $periodStart,
            $periodEnd,
            $companyId,
            10
        );

        $activeByPlan = $this->activeSubscriptionsByPlan($companyId, $planId);

        $subscriptionLineRevenue = $this->subscriptionLineRevenueByCompany($periodStart, $periodEnd, $companyId, $planId);
        $overageLineRevenue = $this->overageLineRevenueByCompany($periodStart, $periodEnd, $companyId, $planId);

        $mrrTrend = $this->mrrTrendMonthly($periodStart, $periodEnd, $companyId, $planId);
        $arrTrend = array_map(static fn (array $r): array => [
            'month' => $r['month'],
            'arr_pence' => $r['mrr_pence'] * 12,
        ], $mrrTrend);

        $hasTaggedInvoices = Invoice::query()
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId))
            ->where('is_subscription_billing', true)
            ->where('invoice_status', '!=', InvoiceStatus::Void)
            ->exists();

        $reportingSurfaceReady = $hasSubscriptionRows || $hasTaggedInvoices || $subscriptionInvoicedPence > 0
            || $subscriptionPaymentsPence > 0 || $activeSubscriptions > 0;

        return [
            'has_subscription_rows' => $hasSubscriptionRows,
            'placeholder_message' => self::PLACEHOLDER,
            'reporting_surface_ready' => $reportingSurfaceReady,
            'mrr' => [
                'value_pence' => $mrrComputable ? $mrrMonthlyPence : null,
                'formatted_gbp' => $mrrComputable ? MoneyFormatting::formatGbpFromPence($mrrMonthlyPence) : null,
                'computable' => $mrrComputable,
                'reason' => $mrrComputable
                    ? null
                    : 'No active subscriptions on a monthly plan with a price snapshot in scope, or amounts are zero.',
            ],
            'arr' => [
                'value_pence' => $arrPence,
                'formatted_gbp' => $arrPence !== null ? MoneyFormatting::formatGbpFromPence($arrPence) : null,
                'computable' => $mrrComputable,
                'reason' => $mrrComputable
                    ? 'ARR shown as 12 × MRR (monthly snapshot total only; yearly/quarterly/weekly plans excluded).'
                    : 'ARR follows MRR; enable MRR first with active monthly subscriptions.',
            ],
            'subscription_counts' => [
                'active' => $activeSubscriptions,
                'cancelled_snapshot' => $cancelledSubscriptionsSnapshot,
                'new_in_period' => $newSubscriptionsInPeriod,
                'cancelled_in_period' => $cancelledSubscriptionsInPeriod,
            ],
            'revenue_invoiced_period_pence' => [
                'subscription_tagged' => $subscriptionInvoicedPence,
                'one_off' => $oneOffInvoicedPence,
                'total' => $invoicedTotalPence,
                'formatted_subscription_tagged' => MoneyFormatting::formatGbpFromPence($subscriptionInvoicedPence),
                'formatted_one_off' => MoneyFormatting::formatGbpFromPence($oneOffInvoicedPence),
                'recurring_share_of_invoiced' => $recurringShare,
            ],
            'revenue_payments_period_pence' => [
                'subscription_tagged' => $subscriptionPaymentsPence,
                'one_off' => $oneOffPaymentsPence,
                'total' => $subscriptionPaymentsPence + $oneOffPaymentsPence,
                'formatted_subscription_tagged' => MoneyFormatting::formatGbpFromPence($subscriptionPaymentsPence),
                'formatted_one_off' => MoneyFormatting::formatGbpFromPence($oneOffPaymentsPence),
            ],
            'split' => [
                'invoiced_recurring_pence' => $subscriptionInvoicedPence,
                'invoiced_one_off_pence' => $oneOffInvoicedPence,
                'payments_recurring_pence' => $subscriptionPaymentsPence,
                'payments_one_off_pence' => $oneOffPaymentsPence,
            ],
            'overdue_subscription_invoices_count' => $overdueSubscriptionInvoices,
            'upcoming_renewals' => $upcomingRenewals,
            'top_subscription_customers' => $topSubscriptionCustomers,
            'active_subscriptions_by_plan' => $activeByPlan,
            'revenue_subscription_lines_by_company' => $subscriptionLineRevenue,
            'revenue_overage_lines_by_company' => $overageLineRevenue,
            'mrr_trend' => $mrrTrend,
            'arr_trend' => $arrTrend,
            'definitions' => [
                'mrr' => 'Sum of price_amount_minor_snapshot for active company_subscriptions whose plan billing_interval is monthly.',
                'arr' => '12 × MRR when MRR is computable (monthly plans only; not a substitute for audited revenue recognition).',
                'active' => 'company_subscriptions rows with status = active.',
                'cancelled_snapshot' => 'Rows with status = cancelled (current snapshot).',
                'new_in_period' => 'Subscription rows created_at within the selected period.',
                'cancelled_in_period' => 'Rows with status cancelled and updated_at in period (approximation until cancellation events exist).',
                'subscription_invoiced' => 'Sum of invoice total_pence issued in period with is_subscription_billing = true, excluding void.',
                'one_off_invoiced' => 'Same cohort but subscription flag false or null, excluding void.',
                'subscription_payments' => 'Sum of payment amount_pence with paid_at in period on non-void invoices flagged subscription billing.',
                'one_off_payments' => 'Payments in period on invoices not subscription-flagged.',
                'overdue_subscription_invoices' => 'Open subscription-flagged invoices past due_on (date) as of end of selected period.',
                'upcoming_renewals' => 'Subscriptions with renews_at falling in the selected date range (inclusive).',
                'top_subscription_customers' => 'Companies ranked by subscription-tagged invoiced total in the period.',
                'active_by_plan' => 'Active subscription rows grouped by subscription plan name (snapshot).',
                'subscription_revenue' => 'Sum of invoice line totals where line_item_type = subscription on invoices issued in period and is_subscription_billing = true (ex void).',
                'overage_revenue' => 'Sum of invoice line totals where line_item_type = overage on invoices issued in period and is_subscription_billing = true (ex void).',
                'mrr_trend' => 'Month-by-month MRR snapshot at each month end (active monthly subscriptions only).',
            ],
            'meta' => [
                'timezone' => $tz,
                'period_end_date_for_overdue' => $asOfDate,
            ],
        ];
    }

    /** @return Builder<Invoice> */
    private function invoicesIssuedInPeriod(
        CarbonImmutable $periodStart,
        CarbonImmutable $periodEnd,
        ?string $companyId,
    ): Builder {
        return Invoice::query()
            ->whereNotNull('issued_on')
            ->whereBetween('issued_on', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->where('invoice_status', '!=', InvoiceStatus::Void)
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId));
    }

    private function overdueSubscriptionInvoiceCount(?string $companyId, string $asOfDate): int
    {
        $q = Invoice::query()
            ->where('is_subscription_billing', true)
            ->whereNotIn('invoice_status', [InvoiceStatus::Void, InvoiceStatus::Paid, InvoiceStatus::Draft])
            ->when($companyId !== null, fn (Builder $b) => $b->where('company_id', $companyId))
            ->whereNotNull('due_on')
            ->whereDate('due_on', '<', $asOfDate)
            ->whereIn('invoice_status', [InvoiceStatus::Sent, InvoiceStatus::Overdue]);

        return (int) $q->whereRaw(
            'invoices.total_pence > COALESCE((SELECT SUM(amount_pence) FROM payments WHERE payments.invoice_id = invoices.id), 0)'
        )->count();
    }

    /**
     * @return list<array{company_id: string, company_name: string|null, subscription_invoiced_pence: int, formatted: string}>
     */
    private function topSubscriptionCustomersByInvoicedPeriod(
        CarbonImmutable $periodStart,
        CarbonImmutable $periodEnd,
        ?string $companyId,
        int $limit,
    ): array {
        $rows = Invoice::query()
            ->whereNotNull('issued_on')
            ->whereBetween('issued_on', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->where('is_subscription_billing', true)
            ->where('invoice_status', '!=', InvoiceStatus::Void)
            ->when($companyId !== null, fn (Builder $q) => $q->where('company_id', $companyId))
            ->selectRaw('company_id, SUM(total_pence) AS s')
            ->groupBy('company_id')
            ->orderByDesc('s')
            ->limit($limit)
            ->get();

        if ($rows->isEmpty()) {
            return [];
        }

        $ids = $rows->pluck('company_id')->map(static fn ($id): string => (string) $id)->all();
        $names = Company::query()->whereIn('id', $ids)->pluck('name', 'id');

        $out = [];
        foreach ($rows as $r) {
            $cid = (string) $r->company_id;
            $pence = (int) $r->s;
            $out[] = [
                'company_id' => $cid,
                'company_name' => $names[$cid] ?? null,
                'subscription_invoiced_pence' => $pence,
                'formatted' => MoneyFormatting::formatGbpFromPence($pence),
            ];
        }

        return $out;
    }

    /**
     * @return list<array{plan_id: string, plan_name: string, active_subscriptions_count: int, mrr_pence: int, formatted_mrr: string}>
     */
    private function activeSubscriptionsByPlan(?string $companyId, ?string $planId): array
    {
        $q = CompanySubscription::query()
            ->join('subscription_plans', 'company_subscriptions.subscription_plan_id', '=', 'subscription_plans.id')
            ->where('company_subscriptions.status', SubscriptionStatus::Active->value)
            ->when($companyId !== null, fn (Builder $b) => $b->where('company_subscriptions.company_id', $companyId))
            ->when($planId !== null, fn (Builder $b) => $b->where('company_subscriptions.subscription_plan_id', $planId))
            ->selectRaw('subscription_plans.id AS plan_id, subscription_plans.name AS plan_name, COUNT(*) AS c, SUM(company_subscriptions.price_amount_minor_snapshot) AS s')
            ->groupBy('subscription_plans.id', 'subscription_plans.name')
            ->orderByDesc('c');

        return $q->get()->map(static function ($r): array {
            $pence = (int) ($r->s ?? 0);

            return [
                'plan_id' => (string) $r->plan_id,
                'plan_name' => (string) $r->plan_name,
                'active_subscriptions_count' => (int) $r->c,
                'mrr_pence' => $pence,
                'formatted_mrr' => MoneyFormatting::formatGbpFromPence($pence),
            ];
        })->values()->all();
    }

    /**
     * @return list<array{company_id: string, company_name: string|null, subscription_revenue_pence: int, formatted: string}>
     */
    private function subscriptionLineRevenueByCompany(
        CarbonImmutable $periodStart,
        CarbonImmutable $periodEnd,
        ?string $companyId,
        ?string $planId,
    ): array {
        $q = InvoiceItem::query()
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->whereBetween('invoices.issued_on', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->where('invoices.invoice_status', '!=', InvoiceStatus::Void->value)
            ->where('invoices.is_subscription_billing', true)
            ->where('invoice_items.line_item_type', InvoiceLineItemType::Subscription->value)
            ->when($companyId !== null, fn (Builder $b) => $b->where('invoices.company_id', $companyId))
            ->when($planId !== null, fn (Builder $b) => $b->whereExists(function ($sq) use ($planId): void {
                $sq->selectRaw('1')
                    ->from('company_subscriptions')
                    ->whereColumn('company_subscriptions.id', 'invoices.source_id')
                    ->where('company_subscriptions.subscription_plan_id', $planId);
            }))
            ->selectRaw('invoices.company_id AS company_id, SUM(invoice_items.line_total_pence) AS s')
            ->groupBy('invoices.company_id')
            ->orderByDesc('s')
            ->limit(50)
            ->get();

        if ($q->isEmpty()) {
            return [];
        }

        $ids = $q->pluck('company_id')->map(static fn ($id): string => (string) $id)->all();
        $names = Company::query()->whereIn('id', $ids)->pluck('name', 'id');

        return $q->map(static function ($r) use ($names): array {
            $cid = (string) $r->company_id;
            $pence = (int) $r->s;

            return [
                'company_id' => $cid,
                'company_name' => $names[$cid] ?? null,
                'subscription_revenue_pence' => $pence,
                'formatted' => MoneyFormatting::formatGbpFromPence($pence),
            ];
        })->values()->all();
    }

    /**
     * @return list<array{company_id: string, company_name: string|null, overage_revenue_pence: int, formatted: string}>
     */
    private function overageLineRevenueByCompany(
        CarbonImmutable $periodStart,
        CarbonImmutable $periodEnd,
        ?string $companyId,
        ?string $planId,
    ): array {
        $q = InvoiceItem::query()
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->whereBetween('invoices.issued_on', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->where('invoices.invoice_status', '!=', InvoiceStatus::Void->value)
            ->where('invoices.is_subscription_billing', true)
            ->where('invoice_items.line_item_type', InvoiceLineItemType::Overage->value)
            ->when($companyId !== null, fn (Builder $b) => $b->where('invoices.company_id', $companyId))
            ->when($planId !== null, fn (Builder $b) => $b->whereExists(function ($sq) use ($planId): void {
                $sq->selectRaw('1')
                    ->from('company_subscriptions')
                    ->whereColumn('company_subscriptions.id', 'invoices.source_id')
                    ->where('company_subscriptions.subscription_plan_id', $planId);
            }))
            ->selectRaw('invoices.company_id AS company_id, SUM(invoice_items.line_total_pence) AS s')
            ->groupBy('invoices.company_id')
            ->orderByDesc('s')
            ->limit(50)
            ->get();

        if ($q->isEmpty()) {
            return [];
        }

        $ids = $q->pluck('company_id')->map(static fn ($id): string => (string) $id)->all();
        $names = Company::query()->whereIn('id', $ids)->pluck('name', 'id');

        return $q->map(static function ($r) use ($names): array {
            $cid = (string) $r->company_id;
            $pence = (int) $r->s;

            return [
                'company_id' => $cid,
                'company_name' => $names[$cid] ?? null,
                'overage_revenue_pence' => $pence,
                'formatted' => MoneyFormatting::formatGbpFromPence($pence),
            ];
        })->values()->all();
    }

    /**
     * @return list<array{month: string, mrr_pence: int}>
     */
    private function mrrTrendMonthly(
        CarbonImmutable $periodStart,
        CarbonImmutable $periodEnd,
        ?string $companyId,
        ?string $planId,
    ): array {
        $startMonth = $periodStart->startOfMonth();
        $endMonth = $periodEnd->startOfMonth();

        $out = [];
        $cursor = $startMonth;
        while ($cursor->lte($endMonth)) {
            $monthEnd = $cursor->endOfMonth()->endOfDay();

            $q = CompanySubscription::query()
                ->where('status', SubscriptionStatus::Active->value)
                ->when($companyId !== null, fn (Builder $b) => $b->where('company_id', $companyId))
                ->when($planId !== null, fn (Builder $b) => $b->where('subscription_plan_id', $planId))
                ->whereNotNull('starts_at')
                ->whereDate('starts_at', '<=', $monthEnd->toDateString())
                ->where(function (Builder $b) use ($monthEnd): void {
                    $b->whereNull('cancelled_at')->orWhereDate('cancelled_at', '>', $monthEnd->toDateString());
                })
                ->whereHas('plan', fn (Builder $b) => $b->where('billing_interval', BillingInterval::Monthly->value));

            $out[] = [
                'month' => $cursor->format('Y-m'),
                'mrr_pence' => (int) $q->sum('price_amount_minor_snapshot'),
            ];

            $cursor = $cursor->addMonthNoOverflow()->startOfMonth();
        }

        return $out;
    }
}
