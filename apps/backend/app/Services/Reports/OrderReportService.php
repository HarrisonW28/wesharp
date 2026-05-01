<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Data\Reports\AdminReportFilters;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Support\Analytics\AnalyticsSql;
use App\Support\Reports\OperationalReportSql;
use App\Support\Reports\ReportEnvelope;

final class OrderReportService
{
    private const RECENT_LIMIT = 25;

    /** Workshop-active order statuses (not finished / cancelled). */
    private const ACTIVE_WORKSHOP_STATUSES = [
        OrderStatus::Draft,
        OrderStatus::Received,
        OrderStatus::Inspection,
        OrderStatus::InProgress,
        OrderStatus::QualityCheck,
    ];

    /** @return array<string, mixed> */
    public function build(AdminReportFilters $f): array
    {
        $createdBase = Order::query()
            ->whereBetween('orders.created_at', [$f->from, $f->to])
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn ($q) => $q->where('orders.company_id', $f->companyId))
            ->when($f->orderStatus !== null, fn ($q) => $q->where('orders.order_status', $f->orderStatus))
            ->when($f->routeId !== null, fn ($q) => $q->where('orders.route_id', $f->routeId));

        $ordersCreatedCount = (int) (clone $createdBase)->count();
        $sumPenceCreatedCohort = (int) (clone $createdBase)->sum('orders.total_pence');
        $averageOrderValuePence = $ordersCreatedCount > 0
            ? (int) floor($sumPenceCreatedCohort / $ordersCreatedCount)
            : 0;

        $activeSnapshot = Order::query()
            ->whereIn('orders.order_status', self::ACTIVE_WORKSHOP_STATUSES)
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn ($q) => $q->where('orders.company_id', $f->companyId))
            ->when($f->orderStatus !== null, fn ($q) => $q->where('orders.order_status', $f->orderStatus))
            ->when($f->routeId !== null, fn ($q) => $q->where('orders.route_id', $f->routeId));

        $activeOrdersCount = (int) (clone $activeSnapshot)->count();

        $completedInPeriod = Order::query()
            ->where('orders.order_status', OrderStatus::Completed)
            ->where(function ($q) use ($f): void {
                $q->whereBetween('orders.completed_at', [$f->from, $f->to])
                    ->orWhere(function ($q2) use ($f): void {
                        $q2->whereNull('orders.completed_at')
                            ->whereBetween('orders.updated_at', [$f->from, $f->to]);
                    });
            })
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn ($q) => $q->where('orders.company_id', $f->companyId))
            ->when($f->orderStatus !== null, fn ($q) => $q->where('orders.order_status', $f->orderStatus))
            ->when($f->routeId !== null, fn ($q) => $q->where('orders.route_id', $f->routeId));

        $completedOrdersCount = (int) (clone $completedInPeriod)->count();

        $cancelledInPeriod = (int) Order::query()
            ->where('orders.order_status', OrderStatus::Cancelled)
            ->whereBetween('orders.updated_at', [$f->from, $f->to])
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn ($q) => $q->where('orders.company_id', $f->companyId))
            ->when($f->orderStatus !== null, fn ($q) => $q->where('orders.order_status', $f->orderStatus))
            ->when($f->routeId !== null, fn ($q) => $q->where('orders.route_id', $f->routeId))
            ->count();

        $dayExpr = AnalyticsSql::dateDay('orders.created_at');
        $ordersByDay = (clone $createdBase)
            ->selectRaw("{$dayExpr} AS bucket, COUNT(*) AS c")
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->map(static fn ($r): array => [
                'date' => (string) $r->bucket,
                'count' => (int) $r->c,
            ])
            ->values()
            ->all();

        $byStatus = (clone $createdBase)
            ->selectRaw('order_status AS status_value, COUNT(*) AS c, SUM(orders.total_pence) AS total_pence')
            ->groupBy('order_status')
            ->orderBy('order_status')
            ->get()
            ->map(static fn ($r): array => [
                'status' => (string) $r->status_value,
                'count' => (int) $r->c,
                'total_pence' => (int) $r->total_pence,
            ])
            ->values()
            ->all();

        $avgCompletionSecondsExpr = OperationalReportSql::avgSecondsBetween('orders.created_at', 'orders.completed_at');
        $averageCompletionHours = null;
        $completionRow = Order::query()
            ->where('orders.order_status', OrderStatus::Completed)
            ->whereNotNull('orders.completed_at')
            ->whereBetween('orders.completed_at', [$f->from, $f->to])
            ->whereCompanyCity($f->city)
            ->when($f->companyId !== null, fn ($q) => $q->where('orders.company_id', $f->companyId))
            ->when($f->orderStatus !== null, fn ($q) => $q->where('orders.order_status', $f->orderStatus))
            ->when($f->routeId !== null, fn ($q) => $q->where('orders.route_id', $f->routeId))
            ->selectRaw("{$avgCompletionSecondsExpr} AS avg_secs")
            ->first();

        if ($completionRow !== null && isset($completionRow->avg_secs) && $completionRow->avg_secs !== null) {
            $avgSecs = (float) $completionRow->avg_secs;
            if ($avgSecs > 0) {
                $averageCompletionHours = round($avgSecs / 3600, 2);
            }
        }

        $ordersTablePage = $f->ordersPage ?? $f->page;

        $paginator = (clone $createdBase)
            ->with(['company:id,name', 'operationalRoute:id,name'])
            ->orderByDesc('orders.created_at')
            ->paginate(perPage: $f->perPage, columns: ['*'], pageName: 'page', page: $ordersTablePage);

        $rows = collect($paginator->items())->map(static function ($o): array {
            /** @var Order $o */
            return [
                'id' => (string) $o->id,
                'order_status' => $o->order_status->value,
                'total_pence' => (int) $o->total_pence,
                'knife_count' => (int) $o->knife_count,
                'company_name' => $o->company?->name,
                'route_name' => $o->operationalRoute?->name,
            ];
        })->values()->all();

        $recent = (clone $createdBase)
            ->with(['company:id,name', 'operationalRoute:id,name'])
            ->orderByDesc('orders.created_at')
            ->limit(self::RECENT_LIMIT)
            ->get()
            ->map(static function (Order $o): array {
                return [
                    'id' => (string) $o->id,
                    'order_status' => $o->order_status->value,
                    'total_pence' => (int) $o->total_pence,
                    'created_at' => $o->created_at?->toIso8601String(),
                    'company_name' => $o->company?->name,
                ];
            })
            ->values()
            ->all();

        $envelope = ReportEnvelope::make(
            'orders',
            $f->toArray(),
            [
                'orders_created_count' => $ordersCreatedCount,
                'active_workshop_orders_count' => $activeOrdersCount,
                'completed_orders_count' => $completedOrdersCount,
                'cancelled_orders_count' => $cancelledInPeriod,
                'total_pence_created_cohort' => $sumPenceCreatedCohort,
                'average_order_value_pence' => $averageOrderValuePence,
                'average_completion_hours' => $averageCompletionHours,
            ],
            [
                'orders_by_day' => $ordersByDay,
                'order_status_breakdown' => $byStatus,
            ],
            [
                'columns' => [
                    ['key' => 'order_status', 'label' => 'Status'],
                    ['key' => 'total_pence', 'label' => 'Total (pence)'],
                    ['key' => 'knife_count', 'label' => 'Knives'],
                    ['key' => 'company_name', 'label' => 'Company'],
                    ['key' => 'route_name', 'label' => 'Route'],
                ],
                'rows' => $rows,
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ],
            [
                'orders_created_count' => 'Orders with created_at in range.',
                'active_workshop_orders_count' => 'Snapshot: draft/received/inspection/in_progress/quality_check matching filters; date range does not apply.',
                'completed_orders_count' => 'Orders completed (status completed) with completed_at in range, or updated_at in range if completed_at null.',
                'cancelled_orders_count' => 'Orders cancelled with updated_at in range.',
                'total_pence_created_cohort' => 'Sum of total_pence for orders created in range.',
                'average_order_value_pence' => 'Mean total_pence for orders created in range.',
                'average_completion_hours' => 'Mean (completed_at − created_at) in hours for completed orders whose completed_at falls in range; null if none.',
            ],
        );

        return array_merge($envelope, [
            'recent_activity' => [
                'columns' => [
                    ['key' => 'order_status', 'label' => 'Status'],
                    ['key' => 'total_pence', 'label' => 'Total (pence)'],
                    ['key' => 'created_at', 'label' => 'Created'],
                    ['key' => 'company_name', 'label' => 'Company'],
                ],
                'rows' => $recent,
            ],
        ]);
    }
}
