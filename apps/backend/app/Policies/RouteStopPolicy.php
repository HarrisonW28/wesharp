<?php

namespace App\Policies;

use App\Models\RouteStop;
use App\Models\User;
use App\Support\Permissions;

final class RouteStopPolicy
{
    public function view(User $user, RouteStop $stop): bool
    {
        return Permissions::userMay($user, Permissions::ROUTES_VIEW);
    }

    /** Field updates & status transitions along the route sequence. */
    public function manage(User $user, RouteStop $stop): bool
    {
        if (! Permissions::userMay($user, Permissions::ROUTE_STOPS_UPDATE)) {
            return false;
        }

        if (Permissions::userMay($user, Permissions::ROUTES_MANAGE)) {
            return true;
        }

        $driverId = $stop->route?->driver_user_id;

        return $driverId !== null && (int) $driverId === (int) $user->getKey();
    }
}
