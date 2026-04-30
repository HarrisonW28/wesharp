<?php

namespace App\Policies;

use App\Models\User;
use App\Support\Permissions;

final class UserPolicy
{
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
