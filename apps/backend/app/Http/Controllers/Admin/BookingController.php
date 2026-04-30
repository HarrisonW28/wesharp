<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Bookings\AssignBookingToRouteAction;
use App\Actions\Bookings\BuildBookingsIndexQuery;
use App\Actions\Bookings\CancelBookingAction;
use App\Actions\Bookings\ConfirmBookingAction;
use App\Actions\Bookings\ConvertBookingToOrderAction;
use App\Enums\BookingStatus;
use App\Enums\ServiceType;
use App\Http\Controllers\Controller;
use App\Http\Requests\AssignBookingToRouteRequest;
use App\Http\Requests\StoreBookingRequest;
use App\Http\Requests\UpdateBookingRequest;
use App\Http\Resources\BookingDetailResource;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\OperationalRoute;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class BookingController extends Controller
{
    public function __construct(
        private readonly BuildBookingsIndexQuery $bookingsIndexQuery,
        private readonly ConfirmBookingAction $confirmBookingAction,
        private readonly CancelBookingAction $cancelBookingAction,
        private readonly AssignBookingToRouteAction $assignBookingToRouteAction,
        private readonly ConvertBookingToOrderAction $convertBookingToOrderAction,
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

        $validated = $request->validated();

        $capture = [
            'scheduled_date' => $booking->scheduled_date,
            'contact_id' => $booking->contact_id,
            'time_window_start' => $booking->time_window_start,
            'time_window_end' => $booking->time_window_end,
            'service_type' => $booking->service_type?->value,
            'estimated_knife_count' => $booking->estimated_knife_count,
            'actual_knife_count' => $booking->actual_knife_count,
            'customer_notes' => $booking->customer_notes,
            'internal_notes' => $booking->internal_notes,
            'price_estimate_pence' => $booking->price_estimate_pence,
        ];

        if (array_key_exists('requested_date', $validated)) {
            $booking->scheduled_date = $validated['requested_date'];
        }

        if (array_key_exists('contact_id', $validated)) {
            $booking->contact_id = $validated['contact_id'];
        }

        foreach (['time_window_start', 'time_window_end', 'customer_notes', 'internal_notes'] as $field) {
            if (array_key_exists($field, $validated)) {
                $booking->{$field} = $validated[$field];
            }
        }

        foreach (['estimated_knife_count', 'actual_knife_count'] as $field) {
            if (array_key_exists($field, $validated)) {
                $booking->{$field} = $validated[$field];
            }
        }

        if (array_key_exists('service_type', $validated)) {
            $booking->service_type = ServiceType::from($validated['service_type']);
        }

        if (array_key_exists('price_estimate', $validated)) {
            $booking->price_estimate_pence = $validated['price_estimate'];
        }

        if ($booking->isDirty()) {
            $booking->save();

            AuditRecorder::record($request->user(), $booking, 'booking.updated', [
                'before' => $capture,
                'after' => [
                    'scheduled_date' => $booking->scheduled_date,
                    'contact_id' => $booking->contact_id,
                    'time_window_start' => $booking->time_window_start,
                    'time_window_end' => $booking->time_window_end,
                    'service_type' => $booking->service_type->value ?? null,
                    'estimated_knife_count' => $booking->estimated_knife_count,
                    'actual_knife_count' => $booking->actual_knife_count,
                    'customer_notes' => $booking->customer_notes,
                    'internal_notes' => $booking->internal_notes,
                    'price_estimate_pence' => $booking->price_estimate_pence,
                ],
            ], $request);
        }

        $booking->load(['company:id,name,city', 'location:id,city']);

        return ApiResponses::success((new BookingResource($booking))->toArray($request));
    }

    public function destroy(Request $request, Booking $booking): never
    {
        abort(501, 'Direct booking deletion is disabled; cancel the booking instead.');
    }

    public function confirm(Request $request, Booking $booking): JsonResponse
    {
        $this->authorize('update', $booking);

        $booking = $this->confirmBookingAction->execute($booking, $request->user(), $request);

        $booking->load(['company:id,name,city', 'location:id,city']);

        return ApiResponses::success((new BookingResource($booking))->toArray($request));
    }

    public function cancel(Request $request, Booking $booking): JsonResponse
    {
        $this->authorize('cancel', $booking);

        $booking = $this->cancelBookingAction->execute($booking, $request->user(), $request);

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
            $sequence
        );

        $booking->load(['company:id,name,city', 'location:id,city', 'assignedRoute', 'routeStop']);

        return ApiResponses::success((new BookingResource($booking))->toArray($request));
    }

    public function convertToOrder(Request $request, Booking $booking): JsonResponse
    {
        $this->authorize('convertToOrder', $booking);

        $order = $this->convertBookingToOrderAction->execute($booking, $request->user(), $request);

        return ApiResponses::success([
            'order_id' => (string) $order->id,
            'order_status' => $order->order_status->value,
        ], 201);
    }
}
