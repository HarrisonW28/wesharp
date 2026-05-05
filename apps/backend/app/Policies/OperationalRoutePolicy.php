<?php

namespace App\Policies;

use App\Enums\UserRole;
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
        if (! Permissions::userMay($user, Permissions::ROUTES_VIEW)) {
            return false;
        }

        $role = $user->resolvedRole();

        if ($role === UserRole::SuperAdmin || $role === UserRole::Admin) {
            return true;
        }

        if ($role === UserRole::Driver) {
            return $route->driver_user_id !== null
                && (int) $route->driver_user_id === (int) $user->getKey();
        }

        if ($role === UserRole::RouteManager) {
            if ($route->driver_user_id === null) {
                return true;
            }

            return (int) $route->driver_user_id === (int) $user->getKey();
        }

        return false;
    }

    public function create(User $user): bool
    {
        return Permissions::userMay($user, Permissions::ROUTES_MANAGE);
    }

    public function update(User $user, OperationalRoute $route): bool
    {
        if (! Permissions::userMay($user, Permissions::ROUTES_MANAGE)) {
            return false;
        }

        $role = $user->resolvedRole();

        if ($role === UserRole::SuperAdmin || $role === UserRole::Admin) {
            return true;
        }

        if ($role === UserRole::Driver) {
            return false;
        }

        if ($role === UserRole::RouteManager) {
            if ($route->driver_user_id === null) {
                return true;
            }

            return (int) $route->driver_user_id === (int) $user->getKey();
        }

        return false;
    }

    /** Start / complete route run — assigned driver or full admin. */
    public function manage(User $user, OperationalRoute $route): bool
    {
        if (! Permissions::userMay($user, Permissions::ROUTES_VIEW)) {
            return false;
        }

        $role = $user->resolvedRole();

        if ($role === UserRole::SuperAdmin || $role === UserRole::Admin) {
            return Permissions::userMay($user, Permissions::ROUTES_MANAGE);
        }

        $driverId = $route->driver_user_id;

        return $driverId !== null && (int) $driverId === (int) $user->getKey();
    }
}
