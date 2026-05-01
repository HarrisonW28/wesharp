<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Data\Reports\AdminReportFilters;
use App\Enums\OperationalRouteStatus;
use App\Enums\RouteStopStatus;
use App\Models\OperationalRoute;
use App\Support\Reports\ReportEnvelope;
use Illuminate\Support\Facades\DB;

final class RouteReportService
{
    /** @return array<string, mixed> */
    public function build(AdminReportFilters $f): array
    {
        $base = OperationalRoute::query()
            ->whereBetween('routes.scheduled_date', [$f->from->toDateString(), $f->to->toDateString()])
            ->when($f->city !== null && $f->city !== '', fn ($q) => $q->where('routes.coverage_city', $f->city))
            ->when($f->area !== null && $f->area !== '', fn ($q) => $q->where('routes.coverage_city', $f->area))
            ->when($f->routeId !== null, fn ($q) => $q->where('routes.id', $f->routeId))
            ->when($f->driverUserId !== null, fn ($q) => $q->where('routes.driver_user_id', $f->driverUserId))
            ->when($f->routeStatus !== null, fn ($q) => $q->where('routes.route_status', $f->routeStatus))
            ->when(
                $f->failureReason !== null && $f->failureReason !== '',
                fn ($q) => $q->whereExists(function ($sub) use ($f): void {
                    $sub->selectRaw('1')
                        ->from('route_stops')
                        ->whereColumn('route_stops.route_id', 'routes.id')
                        ->where('route_stops.route_stop_status', RouteStopStatus::Skipped->value)
                        ->where('route_stops.failure_reason', $f->failureReason);
                })
            );

        $routesCount = (int) (clone $base)->count();

        $routesCompletedCount = (int) (clone $base)
            ->where('routes.route_status', OperationalRouteStatus::Completed->value)
            ->count();

        $routesIdSub = (clone $base)->select('routes.id');

        $stopsAgg = DB::table('route_stops')
            ->whereIn('route_stops.route_id', $routesIdSub)
            ->selectRaw('COUNT(*) AS total_stops')
            ->selectRaw(
                sprintf(
                    "SUM(CASE WHEN route_stops.route_stop_status = '%s' THEN 1 ELSE 0 END) AS completed_stops",
                    RouteStopStatus::Completed->value
                )
            )
            ->selectRaw(
                sprintf(
                    "SUM(CASE WHEN route_stops.route_stop_status = '%s' THEN 1 ELSE 0 END) AS failed_collections",
                    RouteStopStatus::Skipped->value
                )
            )
            ->first();

        $totalStops = $stopsAgg !== null ? (int) ($stopsAgg->total_stops ?? 0) : 0;
        $completedStops = $stopsAgg !== null ? (int) ($stopsAgg->completed_stops ?? 0) : 0;
        $failedCollections = $stopsAgg !== null ? (int) ($stopsAgg->failed_collections ?? 0) : 0;

        $completionRate = $totalStops > 0 ? round($completedStops / $totalStops, 4) : null;
        $avgStopsPerRoute = $routesCount > 0 ? round($totalStops / $routesCount, 2) : null;

        $photosCapturedCount = (int) DB::table('evidence_photos')
            ->join('route_stops', 'route_stops.id', '=', 'evidence_photos.route_stop_id')
            ->whereNull('evidence_photos.archived_at')
            ->whereIn('route_stops.route_id', $routesIdSub)
            ->count();

        $routeStatusBreakdown = (clone $base)
            ->selectRaw('route_status AS status_value, COUNT(*) AS c')
            ->groupBy('route_status')
            ->orderBy('route_status')
            ->get()
            ->map(static fn ($r): array => [
                'status' => (string) $r->status_value,
                'count' => (int) $r->c,
            ])
            ->values()
            ->all();

        $routesByDay = (clone $base)
            ->selectRaw('routes.scheduled_date AS bucket, COUNT(*) AS c')
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->map(static fn ($r): array => [
                'date' => (string) $r->bucket,
                'count' => (int) $r->c,
            ])
            ->values()
            ->all();

        $stopStatusBreakdown = DB::table('route_stops')
            ->whereIn('route_stops.route_id', $routesIdSub)
            ->selectRaw('route_stop_status AS status_value, COUNT(*) AS c')
            ->groupBy('route_stop_status')
            ->orderBy('route_stop_status')
            ->get()
            ->map(static fn ($r): array => [
                'status' => (string) $r->status_value,
                'count' => (int) $r->c,
            ])
            ->values()
            ->all();

        $failedReasons = DB::table('route_stops')
            ->whereIn('route_stops.route_id', $routesIdSub)
            ->where('route_stops.route_stop_status', RouteStopStatus::Skipped->value)
            ->whereNotNull('route_stops.failure_reason')
            ->selectRaw('failure_reason AS reason, COUNT(*) AS c')
            ->groupBy('failure_reason')
            ->orderByDesc('c')
            ->limit(50)
            ->get()
            ->map(static fn ($r): array => [
                'reason' => (string) $r->reason,
                'count' => (int) $r->c,
            ])
            ->values()
            ->all();

        $driverPerformance = (clone $base)
            ->leftJoin('route_stops', 'route_stops.route_id', '=', 'routes.id')
            ->selectRaw('routes.driver_user_id AS driver_user_id')
            ->selectRaw('COUNT(DISTINCT routes.id) AS routes_count')
            ->selectRaw('COUNT(route_stops.id) AS stops_count')
            ->selectRaw(
                sprintf(
                    "SUM(CASE WHEN route_stops.route_stop_status = '%s' THEN 1 ELSE 0 END) AS completed_stops",
                    RouteStopStatus::Completed->value
                )
            )
            ->groupBy('routes.driver_user_id')
            ->orderByDesc('routes_count')
            ->get()
            ->map(static fn ($r): array => [
                'driver_user_id' => $r->driver_user_id !== null ? (int) $r->driver_user_id : null,
                'routes_count' => (int) $r->routes_count,
                'stops_count' => (int) $r->stops_count,
                'completed_stops' => (int) $r->completed_stops,
            ])
            ->values()
            ->all();

        $paginator = (clone $base)
            ->with(['driver:id,name,email'])
            ->withCount('stops')
            ->withCount(['stops as completed_stops_count' => fn ($q) => $q->where('route_stop_status', RouteStopStatus::Completed)])
            ->withCount(['stops as failed_collections_count' => fn ($q) => $q->where('route_stop_status', RouteStopStatus::Skipped)])
            ->orderBy('routes.scheduled_date')
            ->orderBy('routes.name')
            ->paginate(perPage: $f->perPage, columns: ['*'], pageName: 'page', page: $f->page);

        $routeIds = collect($paginator->items())->map(static fn (OperationalRoute $r): string => (string) $r->id)->values()->all();
        $photosByRoute = [];
        if ($routeIds !== []) {
            $photosByRoute = DB::table('evidence_photos')
                ->join('route_stops', 'route_stops.id', '=', 'evidence_photos.route_stop_id')
                ->whereNull('evidence_photos.archived_at')
                ->whereIn('route_stops.route_id', $routeIds)
                ->selectRaw('route_stops.route_id AS route_id, COUNT(*) AS c')
                ->groupBy('route_stops.route_id')
                ->get()
                ->mapWithKeys(static fn ($r) => [(string) $r->route_id => (int) $r->c])
                ->all();
        }

        $rows = collect($paginator->items())->map(static function ($r) use ($photosByRoute): array {
            /** @var OperationalRoute $r */
            $stops = (int) $r->stops_count;
            $completed = (int) ($r->completed_stops_count ?? 0);
            $rate = $stops > 0 ? round($completed / $stops, 4) : null;

            return [
                'id' => (string) $r->id,
                'name' => (string) $r->name,
                'route_status' => $r->route_status->value,
                'scheduled_date' => $r->scheduled_date?->toDateString(),
                'coverage_city' => $r->coverage_city,
                'stops_count' => (int) $r->stops_count,
                'completed_stops_count' => (int) ($r->completed_stops_count ?? 0),
                'failed_collections_count' => (int) ($r->failed_collections_count ?? 0),
                'completion_rate' => $rate,
                'photos_captured_count' => (int) ($photosByRoute[(string) $r->id] ?? 0),
                'driver_name' => $r->driver?->name,
            ];
        })->values()->all();

        return ReportEnvelope::make(
            'routes',
            $f->toArray(),
            [
                'routes_count' => $routesCount,
                'routes_completed_count' => $routesCompletedCount,
                'total_stops' => $totalStops,
                'completed_stops' => $completedStops,
                'failed_collections' => $failedCollections,
                'completion_rate' => $completionRate,
                'average_stops_per_route' => $avgStopsPerRoute,
                'photos_captured_count' => $photosCapturedCount,
            ],
            [
                'routes_by_day' => $routesByDay,
                'route_status_breakdown' => $routeStatusBreakdown,
                'stop_status_breakdown' => $stopStatusBreakdown,
                'failed_collection_reasons' => $failedReasons,
                'driver_performance' => $driverPerformance,
            ],
            [
                'columns' => [
                    ['key' => 'name', 'label' => 'Route'],
                    ['key' => 'route_status', 'label' => 'Status'],
                    ['key' => 'scheduled_date', 'label' => 'Date'],
                    ['key' => 'coverage_city', 'label' => 'City'],
                    ['key' => 'stops_count', 'label' => 'Stops'],
                    ['key' => 'completed_stops_count', 'label' => 'Stops completed'],
                    ['key' => 'failed_collections_count', 'label' => 'Failed'],
                    ['key' => 'completion_rate', 'label' => 'Completion rate'],
                    ['key' => 'photos_captured_count', 'label' => 'Photos'],
                    ['key' => 'driver_name', 'label' => 'Driver'],
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
                'routes_count' => 'Routes with scheduled_date between date_from and date_to (inclusive), plus route filters (status/driver/area/failure_reason).',
                'routes_completed_count' => 'Routes in cohort whose route_status is completed.',
                'total_stops' => 'Count of route_stops belonging to routes in cohort.',
                'completed_stops' => 'Count of route_stops with route_stop_status completed for routes in cohort.',
                'failed_collections' => 'Count of route_stops with route_stop_status skipped for routes in cohort.',
                'completion_rate' => 'completed_stops ÷ total_stops for routes in cohort; null if total_stops is 0.',
                'average_stops_per_route' => 'total_stops ÷ routes_count for routes in cohort; null if routes_count is 0.',
                'photos_captured_count' => 'Count of active evidence_photos linked to route_stops for routes in cohort.',
            ],
        );
    }
}
