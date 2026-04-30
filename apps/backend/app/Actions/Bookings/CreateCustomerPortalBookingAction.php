<?php

declare(strict_types=1);

namespace App\Actions\Bookings;

use App\Enums\BookingStatus;
use App\Enums\ServiceType;
use App\Models\Booking;
use App\Services\Audit\AuditRecorder;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * Customer portal — create a booking in {@see BookingStatus::Requested} with audit trail.
 */
final class CreateCustomerPortalBookingAction
{
    /**
     * @param  array{
     *   location_id: string,
     *   requested_date: string,
     *   time_window_start: ?string,
     *   time_window_end: ?string,
     *   service_type: ServiceType,
     *   estimated_knife_count: ?int,
     *   customer_notes: ?string,
     * }  $payload
     */
    public function execute(Request $request, string $companyId, array $payload): Booking
    {
        /** @phpstan-ignore-next-line */
        $day = Carbon::parse($payload['requested_date'])->timezone('UTC')->startOfDay();

        /** @phpstan-ignore-next-line */
        $booking = Booking::query()->create([
            'company_id' => $companyId,
            'company_location_id' => $payload['location_id'],
            'contact_id' => null,
            'booking_status' => BookingStatus::Requested,
            'service_type' => $payload['service_type'],
            'scheduled_date' => $day,
            'requested_collection_date' => $day,
            'requested_time_window_start' => $payload['time_window_start'],
            'requested_time_window_end' => $payload['time_window_end'],
            'time_window_start' => $payload['time_window_start'],
            'time_window_end' => $payload['time_window_end'],
            'estimated_knife_count' => $payload['estimated_knife_count'],
            'actual_knife_count' => null,
            'customer_notes' => $payload['customer_notes'],
            'internal_notes' => null,
            'price_estimate_pence' => null,
        ]);

        AuditRecorder::record($request->user(), $booking, 'booking.customer_portal_requested', [
            'company_id' => (string) $booking->company_id,
            'location_id' => (string) $booking->company_location_id,
            'scheduled_date' => $booking->scheduled_date?->format('Y-m-d'),
            'requested_time_window_start' => $payload['time_window_start'],
            'requested_time_window_end' => $payload['time_window_end'],
        ], $request);

        $booking->load(['company:id,name,city', 'location:id,city,line_one']);

        return $booking;
    }
}
