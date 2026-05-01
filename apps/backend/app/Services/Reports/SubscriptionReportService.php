<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Data\Reports\AdminReportFilters;
use App\Models\CompanySubscription;
use App\Support\Reports\ReportEnvelope;

/**
 * Subscription rows are CRM/billing placeholders; metrics are factual counts only.
 */
final class SubscriptionReportService
{
    /** @return array<string, mixed> */
    public function build(AdminReportFilters $f): array
    {
        $base = CompanySubscription::query()
            ->when($f->companyId !== null, fn ($q) => $q->where('company_subscriptions.company_id', $f->companyId));

        $total = (int) (clone $base)->count();

        $byStatus = (clone $base)
            ->selectRaw('status AS status_value, COUNT(*) AS c')
            ->groupBy('status')
            ->orderBy('status')
            ->get()
            ->map(static fn ($r): array => [
                'status' => (string) $r->status_value,
                'count' => (int) $r->c,
            ])
            ->values()
            ->all();

        $paginator = (clone $base)
            ->with(['company:id,name'])
            ->orderBy('company_subscriptions.plan_name')
            ->paginate(perPage: $f->perPage, columns: ['*'], pageName: 'page', page: $f->page);

        $rows = collect($paginator->items())->map(static function ($s): array {
            /** @var CompanySubscription $s */
            return [
                'id' => (string) $s->id,
                'plan_name' => (string) $s->plan_name,
                'status' => (string) $s->status,
                'current_period_end' => $s->current_period_end?->toDateString(),
                'company_name' => $s->company?->name,
            ];
        })->values()->all();

        return ReportEnvelope::make(
            'subscriptions',
            $f->toArray(),
            [
                'subscription_row_count' => $total,
            ],
            $byStatus,
            [
                'columns' => [
                    ['key' => 'plan_name', 'label' => 'Plan'],
                    ['key' => 'status', 'label' => 'Status'],
                    ['key' => 'current_period_end', 'label' => 'Period end'],
                    ['key' => 'company_name', 'label' => 'Company'],
                ],
                'rows' => $rows,
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'note' => 'Date range filters do not apply to subscription master rows; filter by company_id only.',
                ],
            ],
            [
                'subscription_row_count' => 'Rows in company_subscriptions (CRM). Not MRR; no proration.',
            ],
        );
    }
}
