<?php

declare(strict_types=1);

namespace App\Support\Routes;

use App\Enums\BookingStatus;
use App\Models\RouteStop;
use App\Services\Audit\AuditRecorder;
use App\Support\Bookings\BookingStatusTransitions;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

/**
 * Keeps booking status aligned with route-stop milestones where the domain graph allows it.
 */
final class RouteStopBookingStatusSync
{
    public static function afterStopCollected(RouteStop $stop, ?Authenticatable $actor, ?Request $request): void
    {
        $booking = $stop->booking;

        if ($booking === null) {
            return;
        }

        if ($booking->booking_status !== BookingStatus::AssignedToRoute) {
            return;
        }

        BookingStatusTransitions::assertCanTransition($booking->booking_status, BookingStatus::Collected);

        $from = $booking->booking_status;
        $booking->booking_status = BookingStatus::Collected;
        $booking->save();

        AuditRecorder::record($actor, $booking, 'booking.synced_from_route_stop', [
            'route_stop_id' => (string) $stop->id,
            'from' => $from->value,
            'to' => BookingStatus::Collected->value,
            'trigger' => 'route_stop.collected',
        ], $request);
    }

    public static function afterStopFailed(RouteStop $stop, ?Authenticatable $actor, ?Request $request): void
    {
        $booking = $stop->booking;

        if ($booking === null) {
            return;
        }

        if ($booking->booking_status !== BookingStatus::AssignedToRoute) {
            return;
        }

        BookingStatusTransitions::assertCanTransition($booking->booking_status, BookingStatus::NoShow);

        $from = $booking->booking_status;
        $booking->booking_status = BookingStatus::NoShow;
        $line = 'Collection failed on route: '.(string) $stop->failure_reason;

        if (is_string($stop->failure_notes) && trim($stop->failure_notes) !== '') {
            $line .= ' · '.trim((string) $stop->failure_notes);
        }

        $existing = trim((string) ($booking->internal_notes ?? ''));
        $booking->internal_notes = $existing === '' ? $line : $existing."\n\n".$line;
        $booking->save();

        AuditRecorder::record($actor, $booking, 'booking.synced_from_route_stop', [
            'route_stop_id' => (string) $stop->id,
            'from' => $from->value,
            'to' => BookingStatus::NoShow->value,
            'trigger' => 'route_stop.failed_collection',
        ], $request);
    }

    public static function afterStopCompleted(RouteStop $stop, ?Authenticatable $actor, ?Request $request): void
    {
        $booking = $stop->booking;

        if ($booking === null) {
            return;
        }

        if ($booking->booking_status !== BookingStatus::Returned) {
            return;
        }

        BookingStatusTransitions::assertCanTransition($booking->booking_status, BookingStatus::Completed);

        $from = $booking->booking_status;
        $booking->booking_status = BookingStatus::Completed;
        $booking->save();

        AuditRecorder::record($actor, $booking, 'booking.synced_from_route_stop', [
            'route_stop_id' => (string) $stop->id,
            'from' => $from->value,
            'to' => BookingStatus::Completed->value,
            'trigger' => 'route_stop.completed',
        ], $request);
    }
}
