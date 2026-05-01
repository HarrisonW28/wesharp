<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\EvidencePhotoVisibility;
use App\Models\EvidencePhoto;
use App\Models\User;
use App\Support\Permissions;

final class EvidencePhotoPolicy
{
    public function view(User $user, EvidencePhoto $photo): bool
    {
        if ($user->resolvedRole()->isCustomer()) {
            return $this->customerCanView($user, $photo);
        }

        return $this->staffCanView($user, $photo);
    }

    /** Stream binary from private disk — same rules as {@see self::view()}. */
    public function viewFile(User $user, EvidencePhoto $photo): bool
    {
        return $this->view($user, $photo);
    }

    public function update(User $user, EvidencePhoto $photo): bool
    {
        if ($user->resolvedRole()->isCustomer()) {
            return false;
        }

        if ($photo->archived_at !== null) {
            return false;
        }

        return $this->staffCanManage($user, $photo);
    }

    public function archive(User $user, EvidencePhoto $photo): bool
    {
        return $this->update($user, $photo);
    }

    private function staffCanView(User $user, EvidencePhoto $photo): bool
    {
        if ($photo->route_stop_id !== null) {
            $stop = $photo->routeStop;

            return $stop !== null && $user->can('view', $stop);
        }

        if ($photo->order_id !== null) {
            $order = $photo->order;

            return $order !== null && $user->can('view', $order);
        }

        return false;
    }

    private function staffCanManage(User $user, EvidencePhoto $photo): bool
    {
        if ($photo->route_stop_id !== null) {
            $stop = $photo->routeStop;

            return $stop !== null && $user->can('manage', $stop);
        }

        if ($photo->order_id !== null) {
            $order = $photo->order;

            return $order !== null && $user->can('update', $order);
        }

        return false;
    }

    private function customerCanView(User $user, EvidencePhoto $photo): bool
    {
        if (! config('wesharp_evidence.show_in_customer_portal', true)) {
            return false;
        }

        if ($photo->visibility !== EvidencePhotoVisibility::CustomerVisible) {
            return false;
        }

        if ($photo->archived_at !== null) {
            return false;
        }

        if ($photo->order_id === null) {
            return false;
        }

        $order = $photo->order;
        if ($order === null) {
            return false;
        }

        return Permissions::userMayForCompany($user, Permissions::ORDERS_VIEW, (string) $order->company_id)
            && (string) $user->company_id === (string) $order->company_id;
    }

    /** Changing visibility to customer_visible may be disabled globally. */
    public function setCustomerVisible(User $user, EvidencePhoto $photo): bool
    {
        if (! $this->update($user, $photo)) {
            return false;
        }

        return (bool) config('wesharp_evidence.allow_customer_visible_photos', true);
    }
}
