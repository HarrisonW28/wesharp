<?php

declare(strict_types=1);

namespace App\Services\Bookings;

use App\Models\Booking;

/**
 * Hard-delete is limited to pristine requested bookings — surface blockers for admin UI.
 */
final class BookingHardDeleteGuard
{
    /**
     * @return list<string> Stable machine keys: orders, route_stop, knives, invoices
     */
    public static function blockers(Booking $booking): array
    {
        $keys = [];

        if ($booking->orders()->exists()) {
            $keys[] = 'orders';
        }

        if ($booking->routeStop()->exists()) {
            $keys[] = 'route_stop';
        }

        if ($booking->knives()->exists()) {
            $keys[] = 'knives';
        }

        if ($booking->orders()->whereHas('invoices')->exists()) {
            $keys[] = 'invoices';
        }

        return array_values(array_unique($keys));
    }
}
