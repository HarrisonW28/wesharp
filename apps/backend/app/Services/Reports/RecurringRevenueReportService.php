<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Data\Reports\AdminReportFilters;
use App\Services\Finance\RecurringRevenueMetricsService;
use App\Support\Reports\ReportEnvelope;
use Carbon\CarbonImmutable;

/**
 * Finance report: subscription rows + subscription-tagged invoice/payment facts; MRR/ARR from monthly snapshots when computable.
 */
final class RecurringRevenueReportService
{
    public function __construct(
        private readonly RecurringRevenueMetricsService $metrics,
    ) {}

    /** @return array<string, mixed> */
    public function build(AdminReportFilters $f): array
    {
        $start = CarbonImmutable::createFromInterface($f->from)->startOfDay();
        $end = CarbonImmutable::createFromInterface($f->to)->endOfDay();
        $d = $this->metrics->build($start, $end, $f->companyId);

        $counts = $d['subscription_counts'];
        $inv = $d['revenue_invoiced_period_pence'];
        $pay = $d['revenue_payments_period_pence'];

        $envelope = ReportEnvelope::make(
            'recurring_revenue',
            $f->toArray(),
            [
                'active_subscriptions_count' => (int) $counts['active'],
                'cancelled_subscriptions_snapshot_count' => (int) $counts['cancelled_snapshot'],
                'new_subscriptions_in_period_count' => (int) $counts['new_in_period'],
                'cancelled_subscriptions_in_period_count' => (int) $counts['cancelled_in_period'],
                'subscription_invoiced_period_pence' => (int) $inv['subscription_tagged'],
                'one_off_invoiced_period_pence' => (int) $inv['one_off'],
                'subscription_payments_period_pence' => (int) $pay['subscription_tagged'],
                'one_off_payments_period_pence' => (int) $pay['one_off'],
                'overdue_subscription_invoices_count' => (int) $d['overdue_subscription_invoices_count'],
                'mrr_computable' => (bool) ($d['mrr']['computable'] ?? false),
                'arr_computable' => (bool) ($d['arr']['computable'] ?? false),
            ],
            [
                'invoiced_split' => [
                    ['bucket' => 'subscription_tagged', 'amount_pence' => (int) $inv['subscription_tagged']],
                    ['bucket' => 'one_off', 'amount_pence' => (int) $inv['one_off']],
                ],
                'payments_split' => [
                    ['bucket' => 'subscription_tagged', 'amount_pence' => (int) $pay['subscription_tagged']],
                    ['bucket' => 'one_off', 'amount_pence' => (int) $pay['one_off']],
                ],
            ],
            [
                'columns' => [
                    ['key' => 'company_name', 'label' => 'Company'],
                    ['key' => 'plan_name', 'label' => 'Plan'],
                    ['key' => 'status', 'label' => 'Status'],
                    ['key' => 'renews_on', 'label' => 'Renews'],
                ],
                'rows' => $d['upcoming_renewals'],
                'meta' => [
                    'note' => 'Subscriptions with renews_at in the selected date range (inclusive).',
                    'row_count' => count($d['upcoming_renewals']),
                ],
            ],
            $d['definitions'],
        );

        return array_merge($envelope, [
            'recurring_revenue_detail' => $d,
            'top_subscription_customers' => [
                'columns' => [
                    ['key' => 'company_name', 'label' => 'Company'],
                    ['key' => 'subscription_invoiced_pence', 'label' => 'Subscription invoiced (pence)'],
                    ['key' => 'formatted', 'label' => 'Subscription invoiced (GBP)'],
                ],
                'rows' => $d['top_subscription_customers'],
            ],
        ]);
    }
}
