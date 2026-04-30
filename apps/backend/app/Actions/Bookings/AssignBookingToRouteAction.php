<?php

namespace App\Actions\Bookings;

use App\Enums\BookingStatus;
use App\Enums\RouteStopStatus;
use App\Models\Booking;
use App\Models\OperationalRoute;
use App\Models\RouteStop;
use App\Services\Audit\AuditRecorder;
use App\Support\Bookings\BookingStatusTransitions;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class AssignBookingToRouteAction
{
    public function execute(
        Booking $booking,
        OperationalRoute $route,
        ?Authenticatable $actor,
        ?Request $request,
        ?string $requestedSequence,
    ): Booking {
        return DB::transaction(function () use ($booking, $route, $actor, $request, $requestedSequence): Booking {
            $routeDateStr = optional($route->scheduled_date)?->format('Y-m-d');
            $bookingDateStr = optional(
                $booking->confirmed_collection_date
                    ?? $booking->requested_collection_date
                    ?? $booking->scheduled_date
            )?->format('Y-m-d');

            if ($routeDateStr === null || $bookingDateStr === null) {
                abort(422, 'Route and booking must have scheduled dates.');
            }

            if ($routeDateStr !== $bookingDateStr) {
                abort(422, 'Route scheduled date must match the booking requested date.');
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

                RouteStop::query()->create([
                    'route_id' => $route->id,
                    'booking_id' => $booking->id,
                    'route_stop_status' => RouteStopStatus::NotStarted,
                    'sequence' => $sequence,
                ]);
            }

            AuditRecorder::record($actor, $booking, 'booking.assigned_route', [
                'route_id' => (string) $route->id,
                'scheduled_date' => $routeDateStr,
                'previous_route_id' => $previousRouteId,
                'stop_change' => $stopChange,
            ], $request);

            return $booking->fresh(['assignedRoute']);
        });
    }
}
