<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Bookings\AssignBookingToRouteAction;
use App\Actions\Routes\CompleteRouteAction;
use App\Actions\Routes\ReorderRouteStopsAction;
use App\Actions\Routes\StartRouteAction;
use App\Enums\BookingStatus;
use App\Enums\OperationalRouteStatus;
use App\Enums\RouteStopStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\ReorderRouteStopsRequest;
use App\Http\Requests\StoreOperationalRouteRequest;
use App\Http\Requests\StoreRouteStopRequest;
use App\Http\Requests\UpdateOperationalRouteRequest;
use App\Models\Booking;
use App\Models\OperationalRoute;
use App\Models\RouteStop;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use App\Support\Routes\RouteCompletionSummary;
use App\Support\Routes\RouteFormatting;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class RouteController extends Controller
{
    public function __construct(
        private readonly StartRouteAction $startRouteAction,
        private readonly CompleteRouteAction $completeRouteAction,
        private readonly ReorderRouteStopsAction $reorderRouteStopsAction,
        private readonly AssignBookingToRouteAction $assignBookingToRouteAction,
    ) {}

    private function restrictRoutesQueryForRequestUser(Builder $base, Request $request): void
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return;
        }

        $role = $user->resolvedRole();

        if ($role === UserRole::SuperAdmin || $role === UserRole::Admin) {
            return;
        }

        if ($role === UserRole::RouteManager) {
            $base->where(function (Builder $q) use ($user): void {
                $q->whereNull('driver_user_id')
                    ->orWhere('driver_user_id', (int) $user->getKey());
            });
        }
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', OperationalRoute::class);

        $date = trim((string) $request->query('date', ''));
        $wantPagination = $request->has('page')
            || $request->has('per_page')
            || $request->boolean('paginate');

        $base = OperationalRoute::query()
            ->with('driver:id,name')
            ->withCount([
                'stops as stops_count',
                'stops as completed_stops_count' => fn (Builder $q) => $q->whereIn(
                    'route_stop_status',
                    [RouteStopStatus::Completed, RouteStopStatus::Skipped],
                ),
            ]);

        $this->restrictRoutesQueryForRequestUser($base, $request);

        if ($date !== '') {
            $ts = strtotime($date);
            if ($ts !== false) {
                $base->whereDate('scheduled_date', date('Y-m-d', $ts));
            }
        }

        $routeStatus = trim((string) $request->query('route_status', ''));
        if ($routeStatus !== '') {
            $statusEnum = OperationalRouteStatus::tryFrom($routeStatus);
            if ($statusEnum !== null) {
                $base->where('route_status', $statusEnum);
            }
        }

        $driverUserId = trim((string) $request->query('driver_user_id', ''));
        if ($driverUserId !== '' && ctype_digit($driverUserId)) {
            $base->where('driver_user_id', (int) $driverUserId);
        }

        $coverageCity = trim((string) $request->query('coverage_city', ''));
        if ($coverageCity !== '') {
            $needle = '%'.addcslashes($coverageCity, '%_\\').'%';
            $base->where('coverage_city', 'like', $needle);
        }

        $qName = trim((string) $request->query('q', ''));
        if ($qName !== '') {
            $needle = '%'.addcslashes($qName, '%_\\').'%';
            $base->where('name', 'like', $needle);
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
            ->tap(fn (Builder $q) => $this->restrictRoutesQueryForRequestUser($q, $request))
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

        $upcoming = OperationalRoute::query()
            ->whereDate('scheduled_date', '>', $today)
            ->tap(fn (Builder $q) => $this->restrictRoutesQueryForRequestUser($q, $request))
            ->with('driver:id,name')
            ->withCount([
                'stops as stops_count',
                'stops as completed_stops_count' => fn (Builder $q) => $q->whereIn(
                    'route_stop_status',
                    [RouteStopStatus::Completed, RouteStopStatus::Skipped],
                ),
            ])
            ->orderBy('scheduled_date')
            ->orderBy('name')
            ->limit(12)
            ->get()
            ->map(static fn (OperationalRoute $r): array => RouteFormatting::listRow($r))
            ->values()
            ->all();

        return ApiResponses::success([
            'date' => $today,
            'primary_route' => $primary !== null ? RouteFormatting::routeDetail($primary) : null,
            'routes' => $routes->map(fn (OperationalRoute $r) => array_merge(RouteFormatting::listRow($r), [
                'stops_count' => $r->stops->count(),
                'completed_stops' => $r->stops->whereIn('route_stop_status', [
                    RouteStopStatus::Completed,
                    RouteStopStatus::Skipped,
                ])->count(),
            ]))->values()->all(),
            'upcoming_routes' => $upcoming,
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

    public function completionSummary(Request $request, OperationalRoute $route): JsonResponse
    {
        $this->authorize('view', $route);

        $route->load(['stops.booking.orders', 'stops.booking.company:id,name']);

        /** @var User|null $viewer */
        $viewer = $request->user();

        return ApiResponses::success(RouteCompletionSummary::build($route, $viewer));
    }

    public function complete(Request $request, OperationalRoute $route): JsonResponse
    {
        $this->authorize('manage', $route);

        $force = $request->boolean('force_complete');

        $route = $this->completeRouteAction->execute($route, $request->user(), $request, $force);

        return ApiResponses::success(RouteFormatting::routeDetail($route));
    }

    public function storeStop(
        StoreRouteStopRequest $request,
        OperationalRoute $route,
    ): JsonResponse {
        $this->authorize('update', $route);

        $validated = $request->validated();

        $booking = Booking::query()->with('company')->findOrFail($validated['booking_id']);

        if ($route->coverage_city !== null && (string) $booking->company?->city !== (string) $route->coverage_city) {
            abort(422, 'Booking company city must match route coverage city when configured.');
        }

        $this->assignBookingToRouteAction->execute(
            $booking,
            $route,
            $request->user(),
            $request,
            null,
            null,
        );

        $booking->load(['routeStop.booking.company', 'routeStop.booking.location']);

        $freshStop = $booking->routeStop;

        if ($freshStop === null) {
            abort(500, 'Route stop was not created.');
        }

        return ApiResponses::success(RouteFormatting::stopSummary($freshStop), 201);
    }

    public function destroyStop(Request $request, OperationalRoute $route, RouteStop $stop): JsonResponse
    {
        if ((string) $stop->route_id !== (string) $route->id) {
            abort(404);
        }

        $this->authorize('update', $route);
        $this->authorize('delete', $stop);

        if ($stop->route_stop_status !== RouteStopStatus::NotStarted) {
            abort(422, 'Only stops that have not started can be removed from the route plan.');
        }

        $booking = $stop->booking()->first();

        $removedStopId = (string) $stop->id;
        $removedBookingId = $booking !== null ? (string) $booking->id : null;

        $stop->delete();

        if ($booking !== null && (string) $booking->assigned_route_id === (string) $route->id) {
            $booking->assigned_route_id = null;

            if ($booking->booking_status === BookingStatus::AssignedToRoute) {
                $booking->booking_status = BookingStatus::Confirmed;
            }

            $booking->save();
        }

        AuditRecorder::record($request->user(), $route, 'route.stop_removed', [
            'route_stop_id' => $removedStopId,
            'booking_id' => $removedBookingId,
        ], $request);

        return ApiResponses::success(RouteFormatting::routeDetail($route->fresh([
            'driver:id,name',
            'stops.booking.company:id,name,city,phone',
            'stops.booking.location',
            'stops.booking.orders:id,booking_id,total_pence,currency',
        ])));
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
