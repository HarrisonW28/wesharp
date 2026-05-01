<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\EvidencePhotoVisibility;
use App\Models\CustomerPortalUpdate;
use App\Models\User;
use App\Support\Permissions;

final class CustomerPortalUpdatePolicy
{
    public function view(User $user, CustomerPortalUpdate $update): bool
    {
        if ($user->resolvedRole()->isCustomer()) {
            return $this->customerCanView($user, $update);
        }

        return Permissions::userMayForCompany($user, Permissions::ORDERS_VIEW, (string) $update->company_id)
            || Permissions::userMayForCompany($user, Permissions::BOOKINGS_VIEW, (string) $update->company_id);
    }

    public function update(User $user, CustomerPortalUpdate $update): bool
    {
        if ($user->resolvedRole()->isCustomer()) {
            return false;
        }

        if ($update->archived_at !== null) {
            return false;
        }

        if ($update->route_stop_id !== null) {
            $stop = $update->routeStop;

            return $stop !== null && $user->can('manage', $stop);
        }

        if ($update->order_id !== null) {
            $order = $update->order;

            return $order !== null && $user->can('update', $order);
        }

        if ($update->booking_id !== null) {
            $booking = $update->booking;

            return $booking !== null && $user->can('update', $booking);
        }

        return false;
    }

    public function archive(User $user, CustomerPortalUpdate $update): bool
    {
        return $this->update($user, $update);
    }

    public function setCustomerVisible(User $user, CustomerPortalUpdate $update): bool
    {
        if (! $this->update($user, $update)) {
            return false;
        }

        return (bool) config('wesharp_evidence.allow_customer_visible_photos', true);
    }

    private function customerCanView(User $user, CustomerPortalUpdate $update): bool
    {
        if (! config('wesharp_evidence.show_in_customer_portal', true)) {
            return false;
        }

        if ($update->visibility !== EvidencePhotoVisibility::CustomerVisible) {
            return false;
        }

        if ($update->archived_at !== null) {
            return false;
        }

        return (string) $user->company_id === (string) $update->company_id;
    }
}
