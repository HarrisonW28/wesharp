<?php

namespace App\Policies;

use App\Models\OperationalRoute;
use App\Models\User;
use App\Support\Permissions;

final class OperationalRoutePolicy
{
    public function viewAny(User $user): bool
    {
        return Permissions::userMay($user, Permissions::ROUTES_VIEW);
    }

    public function view(User $user, OperationalRoute $route): bool
    {
        return Permissions::userMay($user, Permissions::ROUTES_VIEW);
    }

    public function create(User $user): bool
    {
        return Permissions::userMay($user, Permissions::ROUTES_MANAGE);
    }

    public function update(User $user, OperationalRoute $route): bool
    {
        return Permissions::userMay($user, Permissions::ROUTES_MANAGE);
    }

    /** Start / complete lifecycle + reorder + add stops. */
    public function manage(User $user, OperationalRoute $route): bool
    {
        if (! Permissions::userMay($user, Permissions::ROUTES_VIEW)) {
            return false;
        }

        if (Permissions::userMay($user, Permissions::ROUTES_MANAGE)) {
            return true;
        }

        $driverId = $route->driver_user_id;

        return $driverId !== null && (int) $driverId === (int) $user->getKey();
    }
}
