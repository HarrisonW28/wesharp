<?php

namespace App\Policies;

use App\Enums\BookingStatus;
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
        if (! Permissions::userMayForCompany($user, Permissions::BOOKINGS_CANCEL, $booking->company_id)) {
            return false;
        }

        if ($user->resolvedRole()->isCustomer()) {
            if ($booking->assigned_route_id !== null) {
                return false;
            }

            if ($booking->orders()->exists()) {
                return false;
            }

            return in_array($booking->booking_status, [BookingStatus::Requested, BookingStatus::Confirmed], true);
        }

        return true;
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

    /** Rare hard delete for safe draft bookings (see controller guards). */
    public function delete(User $user, Booking $booking): bool
    {
        return Permissions::userMay($user, Permissions::BOOKINGS_DELETE)
            && Permissions::userMayForCompany($user, Permissions::BOOKINGS_DELETE, $booking->company_id);
    }
}
