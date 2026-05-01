<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\RouteStop;
use App\Models\User;
use App\Support\Permissions;

final class RouteStopPolicy
{
    public function view(User $user, RouteStop $stop): bool
    {
        if (! Permissions::userMay($user, Permissions::ROUTES_VIEW)) {
            return false;
        }

        $route = $stop->route;

        if ($route === null) {
            return false;
        }

        return $user->can('view', $route);
    }

    /** Field updates & status transitions — assigned driver or route admin. */
    public function manage(User $user, RouteStop $stop): bool
    {
        if (! Permissions::userMay($user, Permissions::ROUTE_STOPS_UPDATE)) {
            return false;
        }

        $route = $stop->route;

        if ($route === null) {
            return false;
        }

        $role = $user->resolvedRole();

        if ($role === UserRole::SuperAdmin || $role === UserRole::Admin) {
            return Permissions::userMay($user, Permissions::ROUTES_MANAGE);
        }

        $driverId = $route->driver_user_id;

        return $driverId !== null && (int) $driverId === (int) $user->getKey();
    }

    /** Remove a not-yet-started stop from planning (see {@see \App\Http\Controllers\Admin\RouteController::destroyStop}). */
    public function delete(User $user, RouteStop $stop): bool
    {
        return Permissions::userMay($user, Permissions::ROUTES_MANAGE);
    }
}
