<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Support\Permissions;

final class CostAllocationPolicy
{
    public function viewAny(User $user): bool
    {
        return Permissions::userMay($user, Permissions::COSTS_VIEW);
    }

    public function create(User $user): bool
    {
        return Permissions::userMay($user, Permissions::COSTS_MANAGE);
    }
}
