<?php

namespace App\Policies;

use App\Models\Booking;
use App\Models\User;
use App\Support\Permissions;

final class BookingPolicy
{
    public function viewAny(User $user): bool
    {
        return Permissions::userMay($user, Permissions::BOOKINGS_VIEW);
    }

    public function view(User $user, Booking $booking): bool
    {
        return Permissions::userMayForCompany($user, Permissions::BOOKINGS_VIEW, $booking->company_id);
    }

    public function create(User $user): bool
    {
        return Permissions::userMay($user, Permissions::BOOKINGS_CREATE);
    }

    public function update(User $user, Booking $booking): bool
    {
        return Permissions::userMayForCompany($user, Permissions::BOOKINGS_UPDATE, $booking->company_id);
    }

    public function cancel(User $user, Booking $booking): bool
    {
        return Permissions::userMayForCompany($user, Permissions::BOOKINGS_CANCEL, $booking->company_id);
    }

    /** Assign/remove route stop — needs route planning permission. */
    public function assignRoute(User $user, Booking $booking): bool
    {
        return Permissions::userMayForCompany($user, Permissions::BOOKINGS_UPDATE, $booking->company_id)
            && Permissions::userMay($user, Permissions::ROUTES_MANAGE);
    }

    public function convertToOrder(User $user, Booking $booking): bool
    {
        return Permissions::userMayForCompany($user, Permissions::BOOKINGS_UPDATE, $booking->company_id)
            && Permissions::userMay($user, Permissions::ORDERS_CREATE);
    }
}
