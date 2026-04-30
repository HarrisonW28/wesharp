<?php

namespace App\Policies;

use App\Models\Knife;
use App\Models\User;
use App\Support\Permissions;

final class KnifePolicy
{
    public function viewAny(User $user): bool
    {
        return Permissions::userMay($user, Permissions::KNIVES_VIEW);
    }

    public function view(User $user, Knife $knife): bool
    {
        return Permissions::userMayForCompany($user, Permissions::KNIVES_VIEW, $knife->company_id);
    }

    public function update(User $user, Knife $knife): bool
    {
        return Permissions::userMayForCompany($user, Permissions::KNIVES_UPDATE, $knife->company_id);
    }

    public function transition(User $user, Knife $knife): bool
    {
        return Permissions::userMayForCompany($user, Permissions::KNIVES_UPDATE, $knife->company_id);
    }

    /** Standalone blade registration when staff creates without order linkage in future — same rule. */
    public function create(User $user): bool
    {
        return Permissions::userMay($user, Permissions::KNIVES_UPDATE)
            || Permissions::userMay($user, Permissions::ORDERS_CREATE);
    }
}
