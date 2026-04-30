<?php

namespace App\Policies;

use App\Models\User;
use App\Support\Permissions;

final class UserPolicy
{
    /** Admin directory access. */
    public function viewAny(User $actor): bool
    {
        return Permissions::userMay($actor, Permissions::USERS_VIEW);
    }

    public function view(User $actor, User $subject): bool
    {
        return Permissions::userMay($actor, Permissions::USERS_VIEW);
    }

    public function update(User $actor, User $subject): bool
    {
        return Permissions::userMay($actor, Permissions::USERS_MANAGE);
    }

    /** Permit signed-in tenants to tweak their portal-visible profile row. */
    public function updateOwnBasicProfile(User $actor, User $subject): bool
    {
        if ($actor->id !== $subject->id) {
            return false;
        }

        return $subject->resolvedRole()->isCustomer()
            && Permissions::userMay($actor, Permissions::ACCOUNT_SETTINGS_UPDATE);
    }
}
