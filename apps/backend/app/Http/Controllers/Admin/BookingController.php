<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\Bookings\AssignBookingToRouteAction;
use App\Actions\Bookings\BuildBookingsIndexQuery;
use App\Actions\Bookings\CancelBookingAction;
use App\Actions\Bookings\ConfirmBookingAction;
use App\Actions\Bookings\ConvertBookingToOrderAction;
use App\Actions\Bookings\CreateRouteFromBookingPlaceholderAction;
use App\Actions\Bookings\UnassignBookingFromRouteAction;
use App\Actions\Bookings\UpdateAdminBookingAction;
use App\Enums\BookingStatus;
use App\Enums\ServiceType;
use App\Http\Controllers\Controller;
use App\Http\Requests\AssignBookingToRouteRequest;
use App\Http\Requests\CancelBookingRequest;
use App\Http\Requests\ConfirmBookingRequest;
use App\Http\Requests\ConvertBookingToOrderRequest;
use App\Http\Requests\StoreBookingRequest;
use App\Http\Requests\UpdateBookingRequest;
use App\Http\Resources\BookingDetailResource;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\OperationalRoute;
use App\Services\Audit\AuditRecorder;
use App\Services\Bookings\BookingHardDeleteGuard;
use App\Services\Notifications\BookingEmailService;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class BookingController extends Controller
{
    public function __construct(
        private readonly BuildBookingsIndexQuery $bookingsIndexQuery,
        private readonly ConfirmBookingAction $confirmBookingAction,
        private readonly CancelBookingAction $cancelBookingAction,
        private readonly AssignBookingToRouteAction $assignBookingToRouteAction,
        private readonly ConvertBookingToOrderAction $convertBookingToOrderAction,
        private readonly UpdateAdminBookingAction $updateAdminBookingAction,
        private readonly UnassignBookingFromRouteAction $unassignBookingFromRouteAction,
        private readonly CreateRouteFromBookingPlaceholderAction $createRouteFromBookingPlaceholderAction,
        private readonly BookingEmailService $bookingEmails,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Booking::class);

        $perPage = min(50, max(1, (int) $request->query('per_page', 15)));

        $query = $this->bookingsIndexQuery->execute($request);
        $paginator = $query->paginate($perPage)->withQueryString();

        $paginator->getCollection()->transform(
            fn (Booking $booking): array => (new BookingResource($booking))->toArray($request)
        );

        return ApiResponses::paginated($paginator, 'items');
    }

    public function store(StoreBookingRequest $request): JsonResponse
    {
        $this->authorize('create', Booking::class);

        $validated = $request->validated();

        $booking = Booking::query()->create([
            'company_id' => $validated['company_id'],
            'company_location_id' => $validated['location_id'],
            'contact_id' => $validated['contact_id'] ?? null,
            'booking_status' => BookingStatus::Requested,
            'service_type' => ServiceType::from($validated['service_type']),
            'scheduled_date' => $validated['requested_date'],
            'requested_collection_date' => $validated['requested_date'],
            'requested_time_window_start' => $validated['time_window_start'] ?? null,
            'requested_time_window_end' => $validated['time_window_end'] ?? null,
            'time_window_start' => $validated['time_window_start'] ?? null,
            'time_window_end' => $validated['time_window_end'] ?? null,
            'estimated_knife_count' => $validated['estimated_knife_count'] ?? null,
            'actual_knife_count' => $validated['actual_knife_count'] ?? null,
            'customer_notes' => $validated['customer_notes'] ?? null,
            'internal_notes' => $validated['internal_notes'] ?? null,
            'price_estimate_pence' => $validated['price_estimate'] ?? null,
        ]);

        AuditRecorder::record($request->user(), $booking, 'booking.created', [
            'company_id' => (string) $booking->company_id,
            'location_id' => (string) $booking->company_location_id,
            'scheduled_date' => $booking->scheduled_date?->format('Y-m-d'),
        ], $request);

        $booking->load(['company:id,name,city', 'location:id,city', 'assignedRoute:id,name']);

        // Email: booking requested (admin-created bookings still notify the customer; idempotent & logged).
        $this->bookingEmails->sendBookingRequested($booking);

        return ApiResponses::success((new BookingResource($booking))->toArray($request), 201);
    }

    public function show(Request $request, Booking $booking): JsonResponse
    {
        $this->authorize('view', $booking);

        $booking->load([
            'company:id,name,slug,city,phone,billing_email',
            'location',
            'contact',
            'assignedRoute:id,name,route_status,scheduled_date',
            'routeStop',
            'orders' => fn ($q) => $q->latest()->limit(10),
        ]);

        return ApiResponses::success((new BookingDetailResource($booking))->resolve());
    }

    public function update(UpdateBookingRequest $request, Booking $booking): JsonResponse
    {
        $this->authorize('update', $booking);

        $booking = $this->updateAdminBookingAction->execute(
            $booking,
            $request->user(),
            $request->validated(),
            $request
        );

        $booking->load(['company:id,name,city', 'location:id,city', 'assignedRoute:id,name']);

        return ApiResponses::success((new BookingResource($booking))->toArray($request));
    }

    public function destroy(Request $request, Booking $booking): JsonResponse
    {
        $this->authorize('delete', $booking);

        if ($booking->booking_status !== BookingStatus::Requested) {
            return ApiResponses::error(
                'Only draft requested bookings may be permanently deleted. Cancel the booking instead.',
                'booking_delete_blocked',
                422,
                ['blockers' => ['status_not_requested']],
            );
        }

        $blockers = BookingHardDeleteGuard::blockers($booking);
        if ($blockers !== []) {
            return ApiResponses::error(
                'This booking cannot be deleted while linked records exist. Cancel the booking or remove dependencies first.',
                'booking_delete_blocked',
                422,
                ['blockers' => $blockers],
            );
        }

        DB::transaction(function () use ($request, $booking): void {
            AuditRecorder::record($request->user(), $booking, 'booking.hard_deleted', [
                'company_id' => (string) $booking->company_id,
                /** @phpstan-ignore-next-line */
                'scheduled_date' => $booking->scheduled_date?->format('Y-m-d'),
                'status' => $booking->booking_status?->value,
            ], $request);

            $booking->delete();
        });

        return ApiResponses::success(['deleted' => true]);
    }

    public function confirm(ConfirmBookingRequest $request, Booking $booking): JsonResponse
    {
        $this->authorize('update', $booking);

        $overrides = $request->overridePayload();
        $booking = $this->confirmBookingAction->execute(
            $booking,
            $request->user(),
            $request,
            $overrides === [] ? null : $overrides
        );

        $booking->load(['company:id,name,city', 'location:id,city']);

        return ApiResponses::success((new BookingResource($booking))->toArray($request));
    }

    public function cancel(CancelBookingRequest $request, Booking $booking): JsonResponse
    {
        $this->authorize('cancel', $booking);

        $validated = $request->validated();

        /** @phpstan-ignore-next-line */
        $booking = $this->cancelBookingAction->execute(
            $booking,
            $request->user(),
            $request,
            $validated['reason'] ?? null
        );

        $booking->load(['company:id,name,city', 'location:id,city']);

        return ApiResponses::success((new BookingResource($booking))->toArray($request));
    }

    public function assignRoute(AssignBookingToRouteRequest $request, Booking $booking): JsonResponse
    {
        $this->authorize('assignRoute', $booking);

        $route = OperationalRoute::query()->findOrFail($request->validated('route_id'));

        $validated = $request->validated();

        $sequence = isset($validated['sequence']) ? (string) $validated['sequence'] : null;

        $booking = $this->assignBookingToRouteAction->execute(
            $booking,
            $route,
            $request->user(),
            $request,
            $sequence,
            $request->optionalConfirmWindow()
        );

        $booking->load(['company:id,name,city', 'location:id,city', 'assignedRoute', 'routeStop']);

        return ApiResponses::success((new BookingResource($booking))->toArray($request));
    }

    public function unassignRoute(Request $request, Booking $booking): JsonResponse
    {
        $this->authorize('unassignRoute', $booking);

        $booking = $this->unassignBookingFromRouteAction->execute($booking, $request->user(), $request);

        $booking->load(['company:id,name,city', 'location:id,city', 'assignedRoute', 'routeStop']);

        return ApiResponses::success((new BookingResource($booking))->toArray($request));
    }

    public function createRoutePlaceholder(Request $request, Booking $booking): JsonResponse
    {
        $this->authorize('assignRoute', $booking);

        $this->createRouteFromBookingPlaceholderAction->execute($booking, $request->user(), $request);

        return ApiResponses::success([
            'message' => 'Logged placeholder — create the run from Routes for now.',
        ]);
    }

    public function convertToOrder(ConvertBookingToOrderRequest $request, Booking $booking): JsonResponse
    {
        $this->authorize('convertToOrder', $booking);

        $order = $this->convertBookingToOrderAction->execute($booking, $request->user(), $request);

        return ApiResponses::success([
            'order_id' => (string) $order->id,
            'order_status' => $order->order_status->value,
        ], 201);
    }
}
