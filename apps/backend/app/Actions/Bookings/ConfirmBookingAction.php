<?php

namespace App\Actions\Bookings;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Services\Audit\AuditRecorder;
use App\Support\Bookings\BookingStatusTransitions;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ConfirmBookingAction
{
    public function execute(Booking $booking, ?Authenticatable $actor, ?Request $request): Booking
    {
        return DB::transaction(function () use ($booking, $actor, $request): Booking {
            $from = $booking->booking_status;
            BookingStatusTransitions::assertCanTransition($from, BookingStatus::Confirmed);

            $booking->booking_status = BookingStatus::Confirmed;
            $booking->save();

            AuditRecorder::record($actor, $booking, 'booking.status_changed', [
                'from' => $from->value,
                'to' => BookingStatus::Confirmed->value,
                'via' => 'confirm',
            ], $request);

            return $booking->fresh();
        });
    }
}
