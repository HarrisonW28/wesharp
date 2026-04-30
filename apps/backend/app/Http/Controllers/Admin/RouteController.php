<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Routes\CompleteRouteAction;
use App\Actions\Routes\ReorderRouteStopsAction;
use App\Actions\Routes\StartRouteAction;
use App\Enums\OperationalRouteStatus;
use App\Enums\RouteStopStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\ReorderRouteStopsRequest;
use App\Http\Requests\StoreOperationalRouteRequest;
use App\Http\Requests\StoreRouteStopRequest;
use App\Http\Requests\UpdateOperationalRouteRequest;
use App\Models\Booking;
use App\Models\OperationalRoute;
use App\Models\RouteStop;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use App\Support\Routes\RouteFormatting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class RouteController extends Controller
{
    public function __construct(
        private readonly StartRouteAction $startRouteAction,
        private readonly CompleteRouteAction $completeRouteAction,
        private readonly ReorderRouteStopsAction $reorderRouteStopsAction,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', OperationalRoute::class);

        $date = trim((string) $request->query('date', ''));
        $wantPagination = $request->has('page')
            || $request->has('per_page')
            || $request->boolean('paginate');

        $base = OperationalRoute::query()
            ->with('driver:id,name')
            ->withCount('stops');

        if ($date !== '') {
            $ts = strtotime($date);
            if ($ts !== false) {
                $base->whereDate('scheduled_date', date('Y-m-d', $ts));
            }
        }

        if (! $wantPagination) {
            $rows = $base->orderBy('name')->limit(75)->get()->map(
                static fn (OperationalRoute $r): array => RouteFormatting::listRow($r)
            );

            return ApiResponses::success(['items' => $rows]);
        }

        $perPage = min(75, max(1, (int) $request->query('per_page', 50)));
        $base->orderByDesc('scheduled_date');

        $paginator = $base->paginate($perPage)->withQueryString();
        $paginator->getCollection()->transform(
            fn (OperationalRoute $r): array => RouteFormatting::listRow($r)
        );

        return ApiResponses::paginated($paginator, 'items');
    }

    public function today(Request $request): JsonResponse
    {
        $this->authorize('viewAny', OperationalRoute::class);

        $today = now()->toDateString();

        $routes = OperationalRoute::query()
            ->whereDate('scheduled_date', $today)
            ->with([
                'driver:id,name',
                'stops' => fn ($q) => $q->orderBy('sequence')->with([
                    'booking.orders:id,booking_id,total_pence,currency',
                ]),
            ])
            ->orderBy('name')
            ->get();

        /** @phpstan-ignore-next-line */
        $userId = $request->user()?->getAuthIdentifier();

        $primary = $routes->firstWhere('driver_user_id', (int) $userId);

        $metrics = RouteFormatting::todayMetrics($primary !== null ? collect([$primary]) : $routes);

        return ApiResponses::success([
            'date' => $today,
            'primary_route' => $primary !== null ? RouteFormatting::routeDetail($primary) : null,
            'routes' => $routes->map(fn (OperationalRoute $r) => array_merge(RouteFormatting::listRow($r), [
                'stops_count' => $r->stops->count(),
                'completed_stops' => $r->stops->where('route_stop_status', RouteStopStatus::Completed)->count(),
            ]))->values()->all(),
            'metrics' => $metrics,
        ]);
    }

    public function store(StoreOperationalRouteRequest $request): JsonResponse
    {
        $this->authorize('create', OperationalRoute::class);

        $validated = $request->validated();

        $status = isset($validated['route_status'])
            ? OperationalRouteStatus::from($validated['route_status'])
            : OperationalRouteStatus::Scheduled;

        unset($validated['route_status']);

        $route = OperationalRoute::query()->create(array_merge($validated, [
            'route_status' => $status,
            'meta' => [],
        ]));

        AuditRecorder::record($request->user(), $route, 'route.created', [
            'scheduled_date' => $route->scheduled_date?->format('Y-m-d'),
        ], $request);

        $route->load('driver:id,name');

        return ApiResponses::success(array_merge(RouteFormatting::listRow($route), [
            'stops_count' => 0,
            'completed_stops' => 0,
        ]), 201);
    }

    public function show(Request $request, OperationalRoute $route): JsonResponse
    {
        $this->authorize('view', $route);

        return ApiResponses::success(RouteFormatting::routeDetail($route));
    }

    public function update(UpdateOperationalRouteRequest $request, OperationalRoute $route): JsonResponse
    {
        $this->authorize('update', $route);

        $before = $route->only([
            'name',
            'scheduled_date',
            'coverage_city',
            'driver_user_id',
            'notes',
            'meta',
        ]);

        $route->fill($request->validated());
        $route->save();

        AuditRecorder::record($request->user(), $route, 'route.updated', [
            'before' => $before,
            'after' => $route->only(array_merge(array_keys($before), ['name'])),
        ], $request);

        return ApiResponses::success(RouteFormatting::routeDetail($route->fresh(['driver:id,name'])));
    }

    public function start(Request $request, OperationalRoute $route): JsonResponse
    {
        $this->authorize('manage', $route);

        $route = $this->startRouteAction->execute($route, $request->user(), $request);

        return ApiResponses::success(RouteFormatting::routeDetail($route));
    }

    public function complete(Request $request, OperationalRoute $route): JsonResponse
    {
        $this->authorize('manage', $route);

        $route = $this->completeRouteAction->execute($route, $request->user(), $request);

        return ApiResponses::success(RouteFormatting::routeDetail($route));
    }

    public function storeStop(
        StoreRouteStopRequest $request,
        OperationalRoute $route,
    ): JsonResponse {
        $this->authorize('update', $route);

        $validated = $request->validated();

        $booking = Booking::query()->with('company')->findOrFail($validated['booking_id']);

        /** @phpstan-ignore-next-line */
        if (
            optional($booking->scheduled_date)->format('Y-m-d')
            !== optional($route->scheduled_date)->format('Y-m-d')
        ) {
            abort(422, 'Booking scheduled date must match the route.');
        }

        if ($route->coverage_city !== null && (string) $booking->company?->city !== (string) $route->coverage_city) {
            abort(422, 'Booking company city must match route coverage city when configured.');
        }

        $existing = RouteStop::query()->where('booking_id', $booking->id)->exists();

        if ($existing) {
            abort(422, 'This booking is already mapped to another stop.');
        }

        $maxSeq = (int) (RouteStop::query()->where('route_id', $route->id)->max('sequence') ?? 0);

        $stop = RouteStop::query()->create([
            'route_id' => $route->id,
            'booking_id' => $booking->id,
            'route_stop_status' => RouteStopStatus::NotStarted,
            'sequence' => $maxSeq + 1,
        ]);

        AuditRecorder::record($request->user(), $route, 'route.stop_added', [
            'booking_id' => (string) $booking->id,
            'route_stop_id' => (string) $stop->id,
        ], $request);

        $stop->load('booking.company', 'booking.location');

        return ApiResponses::success(RouteFormatting::stopSummary($stop), 201);
    }

    public function reorder(ReorderRouteStopsRequest $request, OperationalRoute $route): JsonResponse
    {
        $this->authorize('update', $route);

        $validated = $request->validated();

        /** @var list<string> $ids */
        $ids = $validated['stop_ids'];

        $this->reorderRouteStopsAction->execute(
            $route,
            $ids,
            $request->user(),
            $request
        );

        return ApiResponses::success(RouteFormatting::routeDetail($route->fresh()));
    }
}
