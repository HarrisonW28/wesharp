<?php

declare(strict_types=1);

namespace App\Actions\Bookings;

use App\Enums\BookingStatus;
use App\Enums\RouteStopStatus;
use App\Models\Booking;
use App\Services\Audit\AuditRecorder;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class UnassignBookingFromRouteAction
{
    public function execute(Booking $booking, ?Authenticatable $actor, ?Request $request): Booking
    {
        return DB::transaction(function () use ($booking, $actor, $request): Booking {
            if ($booking->booking_status !== BookingStatus::AssignedToRoute) {
                abort(422, 'Only bookings assigned to a route can be unassigned.');
            }

            $stop = $booking->routeStop()->first();
            $routeId = $booking->assigned_route_id !== null ? (string) $booking->assigned_route_id : null;

            if ($stop !== null && $stop->route_stop_status !== RouteStopStatus::NotStarted) {
                abort(422, 'Cannot unassign: this stop is already in progress on the route.');
            }

            if ($stop !== null) {
                $stop->delete();
            }

            $booking->assigned_route_id = null;
            $booking->booking_status = BookingStatus::Confirmed;
            $booking->save();

            AuditRecorder::record($actor, $booking, 'booking.route_unassigned', [
                'previous_route_id' => $routeId,
            ], $request);

            return $booking->fresh(['assignedRoute', 'routeStop']);
        });
    }
}
