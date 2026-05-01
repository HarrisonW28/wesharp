<?php

namespace App\Actions\Bookings;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Services\Audit\AuditRecorder;
use App\Support\Bookings\BookingStatusTransitions;
use Carbon\Carbon;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ConfirmBookingAction
{
    /**
     * @param  array<string, mixed>|null  $overrides  Optional confirmed date / window from admin (validated).
     */
    public function execute(Booking $booking, ?Authenticatable $actor, ?Request $request, ?array $overrides = null): Booking
    {
        return DB::transaction(function () use ($booking, $actor, $request, $overrides): Booking {
            $from = $booking->booking_status;
            BookingStatusTransitions::assertCanTransition($from, BookingStatus::Confirmed);

            $booking->booking_status = BookingStatus::Confirmed;

            if ($overrides !== null) {
                foreach (['confirmed_collection_date', 'confirmed_time_window_start', 'confirmed_time_window_end'] as $key) {
                    if (! array_key_exists($key, $overrides)) {
                        continue;
                    }
                    $val = $overrides[$key];
                    if ($val === null || $val === '') {
                        continue;
                    }
                    if ($key === 'confirmed_collection_date') {
                        $day = Carbon::parse((string) $val)->timezone('UTC')->startOfDay();
                        $booking->confirmed_collection_date = $day;
                        $booking->scheduled_date = $day;
                    } else {
                        $booking->{$key} = $val;
                    }
                }
            }

            $reqDate = $booking->requested_collection_date ?? $booking->scheduled_date;
            if ($booking->confirmed_collection_date === null && $reqDate !== null) {
                $booking->confirmed_collection_date = $reqDate;
            }

            $reqStart = $booking->requested_time_window_start ?? $booking->time_window_start;
            $reqEnd = $booking->requested_time_window_end ?? $booking->time_window_end;
            if ($booking->confirmed_time_window_start === null && $reqStart !== null) {
                $booking->confirmed_time_window_start = $reqStart;
            }
            if ($booking->confirmed_time_window_end === null && $reqEnd !== null) {
                $booking->confirmed_time_window_end = $reqEnd;
            }

            $booking->save();

            AuditRecorder::record($actor, $booking, 'booking.confirmed', [
                'from' => $from->value,
                'to' => BookingStatus::Confirmed->value,
                'confirmed_collection_date' => $booking->confirmed_collection_date?->format('Y-m-d'),
                'confirmed_time_window_start' => $booking->confirmed_time_window_start,
                'confirmed_time_window_end' => $booking->confirmed_time_window_end,
            ], $request);

            return $booking->fresh();
        });
    }
}
