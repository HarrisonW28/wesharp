<?php

namespace App\Actions\Bookings;

use App\Enums\BookingStatus;
use App\Enums\RouteStopStatus;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\OperationalRoute;
use App\Models\RouteStop;
use App\Services\Audit\AuditRecorder;
use App\Support\Bookings\BookingStatusTransitions;
use Carbon\Carbon;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class AssignBookingToRouteAction
{
    /**
     * @param  array<string, string>|null  $confirmWindow  Optional confirmed collection date / window to persist on the booking.
     */
    public function execute(
        Booking $booking,
        OperationalRoute $route,
        ?Authenticatable $actor,
        ?Request $request,
        ?string $requestedSequence,
        ?array $confirmWindow = null,
    ): Booking {
        return DB::transaction(function () use ($booking, $route, $actor, $request, $requestedSequence, $confirmWindow): Booking {
            if (in_array($booking->booking_status, [BookingStatus::Cancelled, BookingStatus::NoShow], true)) {
                abort(422, 'Cancelled or no-show bookings cannot be assigned to a route.');
            }

            $routeDateStr = optional($route->scheduled_date)?->format('Y-m-d');

            if ($confirmWindow !== null) {
                foreach ($confirmWindow as $key => $value) {
                    if ($key === 'confirmed_collection_date') {
                        $day = Carbon::parse((string) $value)->timezone('UTC')->startOfDay();
                        $booking->confirmed_collection_date = $day;
                        $booking->scheduled_date = $day;
                    }
                    if ($key === 'confirmed_time_window_start') {
                        $booking->confirmed_time_window_start = $value;
                    }
                    if ($key === 'confirmed_time_window_end') {
                        $booking->confirmed_time_window_end = $value;
                    }
                }
                if ($booking->isDirty()) {
                    $booking->save();
                }
            }

            $bookingDateStr = optional(
                $booking->confirmed_collection_date
                    ?? $booking->requested_collection_date
                    ?? $booking->scheduled_date
            )?->format('Y-m-d');

            if ($routeDateStr === null || $bookingDateStr === null) {
                abort(422, 'Route and booking must have scheduled dates.');
            }

            if ($routeDateStr !== $bookingDateStr) {
                abort(422, 'Route date must match the booking collection date (uses confirmed date when set, otherwise requested).');
            }

            $status = $booking->booking_status;

            if ($status === BookingStatus::Confirmed) {
                BookingStatusTransitions::assertCanTransition($status, BookingStatus::AssignedToRoute);
                $booking->booking_status = BookingStatus::AssignedToRoute;
                $booking->assigned_route_id = $route->id;
                $booking->save();
            } elseif ($status === BookingStatus::AssignedToRoute) {
                $booking->assigned_route_id = $route->id;
                $booking->save();
            } else {
                abort(422, 'Only confirmed or route-assigned bookings can be routed.');
            }

            $duplicateStops = RouteStop::query()->where('booking_id', $booking->id)->count();
            if ($duplicateStops > 1) {
                abort(422, 'This booking has inconsistent route stops. Contact support.');
            }

            $existing = $booking->routeStop()->first();
            $previousRouteId = null;
            $stopChange = 'created';

            if ($existing !== null) {
                $previousRouteId = (string) $existing->route_id;

                if ($requestedSequence !== null && ctype_digit((string) $requestedSequence)) {
                    $existing->sequence = (int) $requestedSequence;
                }
                $existing->route_id = $route->id;
                $existing->route_stop_status = RouteStopStatus::NotStarted;
                $existing->save();

                $stopChange = $previousRouteId !== (string) $route->id ? 'moved' : 'updated';
            } else {
                $maxSeq = (int) (RouteStop::query()->where('route_id', $route->id)->max('sequence') ?? 0);
                $sequence = $requestedSequence !== null && ctype_digit((string) $requestedSequence)
                    ? (int) $requestedSequence
                    : $maxSeq + 1;

                try {
                    RouteStop::query()->create([
                        'route_id' => $route->id,
                        'booking_id' => $booking->id,
                        'route_stop_status' => RouteStopStatus::NotStarted,
                        'sequence' => $sequence,
                    ]);
                } catch (QueryException) {
                    abort(422, 'This booking already has a route stop — use reassign to move it.');
                }
            }

            AuditRecorder::record($actor, $booking, 'booking.assigned_route', [
                'route_id' => (string) $route->id,
                'scheduled_date' => $routeDateStr,
                'previous_route_id' => $previousRouteId,
                'stop_change' => $stopChange,
                'confirmed_collection_date' => $booking->confirmed_collection_date?->format('Y-m-d'),
                'confirmed_time_window_start' => BookingResource::formatTimeSlot($booking->confirmed_time_window_start),
                'confirmed_time_window_end' => BookingResource::formatTimeSlot($booking->confirmed_time_window_end),
            ], $request);

            return $booking->fresh(['assignedRoute']);
        });
    }
}
