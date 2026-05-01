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
            ->selectRaw('company_subscriptions.status AS status_value, COUNT(*) AS c')
            ->groupBy('company_subscriptions.status')
            ->orderBy('company_subscriptions.status')
            ->get()
            ->map(static fn ($r): array => [
                'status' => (string) $r->status_value,
                'count' => (int) $r->c,
            ])
            ->values()
            ->all();

        $paginator = (clone $base)
            ->select('company_subscriptions.*')
            ->with(['company:id,name', 'plan:id,name'])
            ->join('subscription_plans', 'company_subscriptions.subscription_plan_id', '=', 'subscription_plans.id')
            ->orderBy('subscription_plans.name')
            ->orderBy('company_subscriptions.created_at')
            ->paginate(perPage: $f->perPage, columns: ['*'], pageName: 'page', page: $f->page);

        $rows = collect($paginator->items())->map(static function ($s): array {
            /** @var CompanySubscription $s */
            return [
                'id' => (string) $s->id,
                'plan_name' => $s->plan !== null ? (string) $s->plan->name : '',
                'status' => $s->status?->value ?? (string) $s->status,
                'renews_at' => $s->renews_at?->toDateString(),
                'price_amount_minor_snapshot' => (int) $s->price_amount_minor_snapshot,
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
                    ['key' => 'renews_at', 'label' => 'Renews'],
                    ['key' => 'price_amount_minor_snapshot', 'label' => 'Price snapshot (minor)'],
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
                'subscription_row_count' => 'Rows in company_subscriptions (CRM). Price snapshot is frozen at assignment; MRR uses active monthly subscriptions only.',
            ],
        );
    }
}
