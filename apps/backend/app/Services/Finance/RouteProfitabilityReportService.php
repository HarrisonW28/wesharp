<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Data\Reports\AdminReportFilters;
use App\Enums\CostAllocationTargetType;
use App\Enums\CostStatus;
use App\Enums\OrderStatus;
use App\Enums\RouteStopStatus;
use App\Models\CostAllocation;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\RouteStop;
use App\Models\User;
use App\Support\Money\MoneyFormatting;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Sprint 24.4 — route and driver profitability from orders, stops, evidence and cost allocations.
 */
final class RouteProfitabilityReportService
{
    private const DRIVER_ROW_LIMIT = 40;

    /** @return array<string, mixed> */
    public function build(AdminReportFilters $f): array
    {
        $base = $this->routesBase($f);

        $routesCount = (int) (clone $base)->count();
        $routesIdSub = (clone $base)->select('routes.id');
        $allRouteIds = DB::table('routes')->whereIn('id', $routesIdSub)->pluck('id')->map(static fn ($id): string => (string) $id)->values()->all();

        $orderStats = $this->orderStatsByRoute($allRouteIds);
        $allocStats = $this->allocationStatsByRoute($allRouteIds, $f);

        $totalRevenue = array_sum(array_column($orderStats, 'revenue_pence'));
        $totalAllocated = array_sum(array_column($allocStats, 'allocated_total_pence'));

        $stopTiming = $this->stopTimingForRoutes($allRouteIds);
        $photoCompliance = $this->photoComplianceByRoute($allRouteIds);

        $drivers = $this->driverRollup($base, $f, $orderStats, $allocStats, $stopTiming, $photoCompliance);

        $paginator = (clone $base)
            ->with(['driver:id,name,email'])
            ->withCount('stops')
            ->withCount(['stops as completed_stops_count' => fn ($q) => $q->where('route_stop_status', RouteStopStatus::Completed)])
            ->withCount(['stops as failed_collections_count' => fn ($q) => $q->where('route_stop_status', RouteStopStatus::Skipped)])
            ->orderBy('routes.scheduled_date')
            ->orderBy('routes.name')
            ->paginate(perPage: $f->perPage, columns: ['*'], pageName: 'page', page: $f->page);

        $routeRows = collect($paginator->items())->map(function ($r) use ($orderStats, $allocStats, $stopTiming, $photoCompliance): array {
            /** @var OperationalRoute $r */
            $rid = (string) $r->id;
            $orders = $orderStats[$rid] ?? ['orders_count' => 0, 'knives_count' => 0, 'revenue_pence' => 0];
            $alloc = $allocStats[$rid] ?? [
                'allocated_total_pence' => 0,
                'allocated_fuel_pence' => 0,
                'allocated_consumable_pence' => 0,
                'allocated_other_pence' => 0,
            ];
            $margin = $orders['revenue_pence'] - $alloc['allocated_total_pence'];
            $stops = (int) $r->stops_count;
            $completed = (int) ($r->completed_stops_count ?? 0);
            $timing = $stopTiming[$rid] ?? ['avg_stop_minutes' => null, 'samples' => 0];
            $photos = $photoCompliance[$rid] ?? ['completed_stops' => 0, 'stops_with_photo' => 0, 'rate' => null];

            return [
                'id' => $rid,
                'name' => (string) $r->name,
                'route_status' => $r->route_status->value,
                'scheduled_date' => $r->scheduled_date?->toDateString(),
                'coverage_city' => $r->coverage_city,
                'driver_user_id' => $r->driver_user_id,
                'driver_name' => $r->driver?->name,
                'notes_excerpt' => $this->notesExcerpt($r->notes),
                'stops_count' => $stops,
                'completed_stops_count' => $completed,
                'failed_collections_count' => (int) ($r->failed_collections_count ?? 0),
                'completion_rate' => $stops > 0 ? round($completed / $stops, 4) : null,
                'orders_on_route_count' => $orders['orders_count'],
                'knives_on_route_count' => $orders['knives_count'],
                'revenue_pence' => $orders['revenue_pence'],
                'formatted_revenue' => MoneyFormatting::formatGbpFromPence($orders['revenue_pence']),
                'allocated_cost_pence' => $alloc['allocated_total_pence'],
                'formatted_allocated_cost' => MoneyFormatting::formatGbpFromPence($alloc['allocated_total_pence']),
                'allocated_fuel_pence' => $alloc['allocated_fuel_pence'],
                'formatted_allocated_fuel' => MoneyFormatting::formatGbpFromPence($alloc['allocated_fuel_pence']),
                'allocated_consumable_pence' => $alloc['allocated_consumable_pence'],
                'formatted_allocated_consumable' => MoneyFormatting::formatGbpFromPence($alloc['allocated_consumable_pence']),
                'allocated_other_pence' => $alloc['allocated_other_pence'],
                'formatted_allocated_other' => MoneyFormatting::formatGbpFromPence($alloc['allocated_other_pence']),
                'route_margin_pence' => $margin,
                'formatted_route_margin' => MoneyFormatting::formatGbpFromPence($margin),
                'average_stop_minutes' => $timing['avg_stop_minutes'],
                'stop_timing_samples' => $timing['samples'],
                'photo_compliance_rate' => $photos['rate'],
                'completed_stops_with_photo_count' => $photos['stops_with_photo'],
            ];
        })->values()->all();

        return [
            'definitions' => [
                'route_revenue' => 'Sum of order total_pence for orders linked to the route with status completed, invoiced, or returned.',
                'allocated_costs' => 'Sum of cost_allocations rows created in the filter window targeting the route (target_type = route). Fuel vs consumable vs other uses linked cost_item category / consumable_usage.',
                'route_margin' => 'Route revenue minus allocated route costs for the period — operational estimate, not statutory accounts.',
                'average_stop_time' => 'Mean minutes between arrived_at and departed_at on stops marked completed where both timestamps exist.',
                'photo_compliance' => 'Share of completed stops on the route that have at least one active evidence photo.',
                'driver_performance' => 'Aggregates across routes in the cohort for each driver_user_id — excludes routes with no assigned driver.',
            ],
            'filters_applied' => $f->toArray(),
            'sales_route' => [
                'implemented' => false,
                'message' => 'Dedicated sales-route journeys are not modelled in this codebase yet; use Sprint 24.5 sales/POS reporting where applicable.',
            ],
            'kpis' => [
                'routes_count' => $routesCount,
                'total_route_revenue_pence' => $totalRevenue,
                'formatted_total_route_revenue' => MoneyFormatting::formatGbpFromPence($totalRevenue),
                'total_allocated_cost_pence' => $totalAllocated,
                'formatted_total_allocated_cost' => MoneyFormatting::formatGbpFromPence($totalAllocated),
                'total_route_margin_pence' => $totalRevenue - $totalAllocated,
                'formatted_total_route_margin' => MoneyFormatting::formatGbpFromPence($totalRevenue - $totalAllocated),
            ],
            'drivers' => $drivers,
            'routes' => [
                'columns' => [
                    ['key' => 'name', 'label' => 'Route'],
                    ['key' => 'scheduled_date', 'label' => 'Date'],
                    ['key' => 'route_status', 'label' => 'Status'],
                    ['key' => 'driver_name', 'label' => 'Driver'],
                    ['key' => 'stops_count', 'label' => 'Stops'],
                    ['key' => 'completed_stops_count', 'label' => 'Completed'],
                    ['key' => 'failed_collections_count', 'label' => 'Failed'],
                    ['key' => 'orders_on_route_count', 'label' => 'Orders'],
                    ['key' => 'knives_on_route_count', 'label' => 'Knives'],
                    ['key' => 'formatted_revenue', 'label' => 'Revenue'],
                    ['key' => 'formatted_allocated_cost', 'label' => 'Allocated'],
                    ['key' => 'formatted_route_margin', 'label' => 'Margin'],
                    ['key' => 'formatted_allocated_fuel', 'label' => 'Fuel alloc.'],
                    ['key' => 'formatted_allocated_consumable', 'label' => 'Consumable alloc.'],
                    ['key' => 'average_stop_minutes', 'label' => 'Avg stop (min)'],
                    ['key' => 'photo_compliance_rate', 'label' => 'Photo compliance'],
                ],
                'rows' => $routeRows,
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ],
            'disclaimer' => 'Margins use operational order totals and ledger allocations dated in the window; they do not replace invoiced revenue recognition or audited route costing.',
        ];
    }

    /** @return Builder<OperationalRoute> */
    private function routesBase(AdminReportFilters $f): Builder
    {
        return OperationalRoute::query()
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
    }

    /**
     * @param  list<string>  $routeIds
     * @return array<string, array{orders_count: int, knives_count: int, revenue_pence: int}>
     */
    private function orderStatsByRoute(array $routeIds): array
    {
        if ($routeIds === []) {
            return [];
        }

        $billable = [
            OrderStatus::Completed->value,
            OrderStatus::Invoiced->value,
            OrderStatus::Returned->value,
        ];

        $rows = Order::query()
            ->whereIn('route_id', $routeIds)
            ->whereIn('order_status', $billable)
            ->groupBy('route_id')
            ->selectRaw('route_id')
            ->selectRaw('COUNT(*) AS orders_count')
            ->selectRaw('COALESCE(SUM(knife_count), 0) AS knives_count')
            ->selectRaw('COALESCE(SUM(total_pence), 0) AS revenue_pence')
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $rid = (string) $row->route_id;
            $map[$rid] = [
                'orders_count' => (int) $row->orders_count,
                'knives_count' => (int) $row->knives_count,
                'revenue_pence' => (int) $row->revenue_pence,
            ];
        }

        return $map;
    }

    /**
     * @param  list<string>  $routeIds
     * @return array<string, array{allocated_total_pence: int, allocated_fuel_pence: int, allocated_consumable_pence: int, allocated_other_pence: int}>
     */
    private function allocationStatsByRoute(array $routeIds, AdminReportFilters $f): array
    {
        if ($routeIds === []) {
            return [];
        }

        $rows = CostAllocation::query()
            ->with(['costItem.category', 'consumableUsage.consumable.costItem'])
            ->where('target_type', CostAllocationTargetType::Route)
            ->whereBetween('created_at', [$f->from, $f->to])
            ->whereIn('target_id', $routeIds)
            ->get();

        $map = [];

        foreach ($rows as $row) {
            if ($this->allocationTouchesArchivedCatalogue($row)) {
                continue;
            }
            $rid = (string) $row->target_id;
            if (! isset($map[$rid])) {
                $map[$rid] = [
                    'allocated_total_pence' => 0,
                    'allocated_fuel_pence' => 0,
                    'allocated_consumable_pence' => 0,
                    'allocated_other_pence' => 0,
                ];
            }

            $amount = (int) $row->amount_pence;
            $map[$rid]['allocated_total_pence'] += $amount;

            $fuel = 0;
            $consumable = 0;
            $other = 0;

            if ($row->consumable_usage_id !== null) {
                $consumable = $amount;
            } else {
                $slug = $row->costItem?->category?->slug;
                $isConsumableItem = (bool) ($row->costItem?->is_consumable ?? false);

                if ($slug === 'route_and_vehicle') {
                    $fuel = $amount;
                } elseif ($isConsumableItem || $slug === 'consumables_and_spares') {
                    $consumable = $amount;
                } else {
                    $other = $amount;
                }
            }

            $map[$rid]['allocated_fuel_pence'] += $fuel;
            $map[$rid]['allocated_consumable_pence'] += $consumable;
            $map[$rid]['allocated_other_pence'] += $other;
        }

        return $map;
    }

    /**
     * @param  list<string>  $routeIds
     * @return array<string, array{avg_stop_minutes: ?float, samples: int}>
     */
    private function stopTimingForRoutes(array $routeIds): array
    {
        if ($routeIds === []) {
            return [];
        }

        $stops = RouteStop::query()
            ->whereIn('route_id', $routeIds)
            ->where('route_stop_status', RouteStopStatus::Completed)
            ->whereNotNull('arrived_at')
            ->whereNotNull('departed_at')
            ->get(['route_id', 'arrived_at', 'departed_at']);

        $buckets = [];

        foreach ($stops as $stop) {
            $rid = (string) $stop->route_id;
            $arrived = $stop->arrived_at;
            $departed = $stop->departed_at;
            if ($arrived === null || $departed === null) {
                continue;
            }

            $minutes = $departed->diffInMinutes($arrived, absolute: true);
            if (! isset($buckets[$rid])) {
                $buckets[$rid] = ['total_minutes' => 0.0, 'samples' => 0];
            }
            $buckets[$rid]['total_minutes'] += $minutes;
            $buckets[$rid]['samples']++;
        }

        $out = [];

        foreach ($buckets as $rid => $b) {
            $samples = $b['samples'];
            $out[$rid] = [
                'avg_stop_minutes' => $samples > 0 ? round($b['total_minutes'] / $samples, 2) : null,
                'samples' => $samples,
            ];
        }

        return $out;
    }

    /**
     * @param  list<string>  $routeIds
     * @return array<string, array{completed_stops: int, stops_with_photo: int, rate: ?float}>
     */
    private function photoComplianceByRoute(array $routeIds): array
    {
        if ($routeIds === []) {
            return [];
        }

        $completedByRoute = RouteStop::query()
            ->whereIn('route_id', $routeIds)
            ->where('route_stop_status', RouteStopStatus::Completed)
            ->groupBy('route_id')
            ->selectRaw('route_id')
            ->selectRaw('COUNT(*) AS c')
            ->pluck('c', 'route_id');

        $withPhoto = DB::table('evidence_photos')
            ->join('route_stops', 'route_stops.id', '=', 'evidence_photos.route_stop_id')
            ->whereNull('evidence_photos.archived_at')
            ->whereIn('route_stops.route_id', $routeIds)
            ->where('route_stops.route_stop_status', RouteStopStatus::Completed->value)
            ->groupBy('route_stops.route_id')
            ->selectRaw('route_stops.route_id AS route_id')
            ->selectRaw('COUNT(DISTINCT route_stops.id) AS c')
            ->pluck('c', 'route_id');

        $out = [];

        foreach ($routeIds as $rid) {
            $completed = (int) ($completedByRoute[(string) $rid] ?? 0);
            $photoStops = (int) ($withPhoto[(string) $rid] ?? 0);
            $rate = $completed > 0 ? round($photoStops / $completed, 4) : null;
            $out[(string) $rid] = [
                'completed_stops' => $completed,
                'stops_with_photo' => $photoStops,
                'rate' => $rate,
            ];
        }

        return $out;
    }

    /**
     * @param  array<string, array{orders_count: int, knives_count: int, revenue_pence: int}>  $orderStats
     * @param  array<string, array{allocated_total_pence: int, allocated_fuel_pence: int, allocated_consumable_pence: int, allocated_other_pence: int}>  $allocStats
     * @param  array<string, array{avg_stop_minutes: ?float, samples: int}>  $stopTiming
     * @param  array<string, array{completed_stops: int, stops_with_photo: int, rate: ?float}>  $photoCompliance
     * @return list<array<string, mixed>>
     */
    private function driverRollup(
        Builder $base,
        AdminReportFilters $f,
        array $orderStats,
        array $allocStats,
        array $stopTiming,
        array $photoCompliance,
    ): array {
        $routeRows = (clone $base)
            ->whereNotNull('routes.driver_user_id')
            ->get(['id', 'driver_user_id']);

        $routesByDriver = [];

        foreach ($routeRows as $route) {
            $driverId = (int) $route->driver_user_id;
            $routesByDriver[$driverId][] = (string) $route->id;
        }

        if ($routesByDriver === []) {
            return [];
        }

        $names = User::query()
            ->whereIn('id', array_keys($routesByDriver))
            ->pluck('name', 'id');

        $issuesByDriver = $this->issuesRaisedByDriver($base);

        $driverStats = [];

        foreach ($routesByDriver as $driverId => $rids) {
            $rev = 0;
            $alloc = 0;
            $fuel = 0;
            $consumable = 0;
            $stopSamples = 0;
            $stopMinutes = 0.0;
            $compStops = 0;
            $photoStops = 0;

            foreach ($rids as $rid) {
                $rev += $orderStats[$rid]['revenue_pence'] ?? 0;
                $alloc += $allocStats[$rid]['allocated_total_pence'] ?? 0;
                $fuel += $allocStats[$rid]['allocated_fuel_pence'] ?? 0;
                $consumable += $allocStats[$rid]['allocated_consumable_pence'] ?? 0;

                $timing = $stopTiming[$rid] ?? null;
                if ($timing !== null && $timing['samples'] > 0) {
                    $stopSamples += $timing['samples'];
                    $stopMinutes += ($timing['avg_stop_minutes'] ?? 0) * $timing['samples'];
                }

                $pc = $photoCompliance[$rid] ?? ['completed_stops' => 0, 'stops_with_photo' => 0];
                $compStops += $pc['completed_stops'];
                $photoStops += $pc['stops_with_photo'];
            }

            $avgCompletion = $stopSamples > 0 ? round($stopMinutes / $stopSamples, 2) : null;
            $photoRate = $compStops > 0 ? round($photoStops / $compStops, 4) : null;

            $driverStats[] = [
                'driver_user_id' => $driverId,
                'driver_name' => (string) ($names[$driverId] ?? ''),
                'routes_assigned_count' => count($rids),
                'assigned_stop_count' => $this->stopCountForRoutes($rids),
                'completed_stop_count' => $this->completedStopCountForRoutes($rids),
                'failed_stop_count' => $this->failedStopCountForRoutes($rids),
                'average_completion_minutes' => $avgCompletion,
                'issues_raised_count' => $issuesByDriver[$driverId] ?? 0,
                'photo_compliance_rate' => $photoRate,
                'revenue_pence' => $rev,
                'formatted_revenue' => MoneyFormatting::formatGbpFromPence($rev),
                'allocated_cost_pence' => $alloc,
                'formatted_allocated_cost' => MoneyFormatting::formatGbpFromPence($alloc),
                'allocated_fuel_pence' => $fuel,
                'formatted_allocated_fuel' => MoneyFormatting::formatGbpFromPence($fuel),
                'allocated_consumable_pence' => $consumable,
                'formatted_allocated_consumable' => MoneyFormatting::formatGbpFromPence($consumable),
                'route_margin_pence' => $rev - $alloc,
                'formatted_route_margin' => MoneyFormatting::formatGbpFromPence($rev - $alloc),
            ];
        }

        usort($driverStats, static fn (array $a, array $b): int => ($b['revenue_pence'] ?? 0) <=> ($a['revenue_pence'] ?? 0));

        return array_slice($driverStats, 0, self::DRIVER_ROW_LIMIT);
    }

    /** @param  list<string>  $routeIds */
    private function stopCountForRoutes(array $routeIds): int
    {
        if ($routeIds === []) {
            return 0;
        }

        return (int) RouteStop::query()->whereIn('route_id', $routeIds)->count();
    }

    /** @param  list<string>  $routeIds */
    private function completedStopCountForRoutes(array $routeIds): int
    {
        if ($routeIds === []) {
            return 0;
        }

        return (int) RouteStop::query()
            ->whereIn('route_id', $routeIds)
            ->where('route_stop_status', RouteStopStatus::Completed)
            ->count();
    }

    /** @param  list<string>  $routeIds */
    private function failedStopCountForRoutes(array $routeIds): int
    {
        if ($routeIds === []) {
            return 0;
        }

        return (int) RouteStop::query()
            ->whereIn('route_id', $routeIds)
            ->where('route_stop_status', RouteStopStatus::Skipped)
            ->count();
    }

    /** @return array<int, int> driver_user_id => count */
    private function issuesRaisedByDriver(Builder $base): array
    {
        $routesIdSub = (clone $base)->select('routes.id');

        $rows = DB::table('route_stops')
            ->join('routes', 'routes.id', '=', 'route_stops.route_id')
            ->whereIn('route_stops.route_id', $routesIdSub)
            ->whereNotNull('routes.driver_user_id')
            ->where(function ($q): void {
                $q->where(function ($q2): void {
                    $q2->where('route_stops.route_stop_status', RouteStopStatus::Completed->value)
                        ->whereNotNull('route_stops.damage_notes')
                        ->where('route_stops.damage_notes', '!=', '');
                })->orWhere(function ($q2): void {
                    $q2->where('route_stops.route_stop_status', RouteStopStatus::Skipped->value)
                        ->whereNotNull('route_stops.failure_notes')
                        ->where('route_stops.failure_notes', '!=', '');
                });
            })
            ->groupBy('routes.driver_user_id')
            ->selectRaw('routes.driver_user_id AS driver_user_id')
            ->selectRaw('COUNT(*) AS c')
            ->get();

        $map = [];

        foreach ($rows as $row) {
            $map[(int) $row->driver_user_id] = (int) $row->c;
        }

        return $map;
    }

    private function allocationTouchesArchivedCatalogue(CostAllocation $row): bool
    {
        $direct = $row->costItem;
        if ($direct !== null && $direct->status === CostStatus::Archived) {
            return true;
        }

        $usageCatalogue = $row->consumableUsage?->consumable?->costItem;
        if ($usageCatalogue !== null && $usageCatalogue->status === CostStatus::Archived) {
            return true;
        }

        return false;
    }

    private function notesExcerpt(?string $notes): ?string
    {
        if ($notes === null || trim($notes) === '') {
            return null;
        }

        $t = trim($notes);

        return mb_strlen($t) > 160 ? mb_substr($t, 0, 157).'…' : $t;
    }
}
