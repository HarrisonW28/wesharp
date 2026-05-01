<?php

declare(strict_types=1);

namespace App\Actions\Bookings;

use App\Models\Booking;
use App\Services\Audit\AuditRecorder;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

/**
 * Placeholder until “create route from booking” workflow exists.
 */
final class CreateRouteFromBookingPlaceholderAction
{
    public function execute(Booking $booking, ?Authenticatable $actor, ?Request $request): void
    {
        AuditRecorder::record($actor, $booking, 'booking.create_route_placeholder', [
            'note' => 'Route creation from booking is not implemented — use Routes console.',
            'collection_date' => $booking->confirmed_collection_date?->format('Y-m-d')
                ?? $booking->requested_collection_date?->format('Y-m-d')
                ?? $booking->scheduled_date?->format('Y-m-d'),
        ], $request);
    }
}
