<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\CostItem;
use App\Models\User;
use App\Support\Permissions;

final class CostItemPolicy
{
    public function viewAny(User $user): bool
    {
        return Permissions::userMay($user, Permissions::COSTS_VIEW);
    }

    public function view(User $user, CostItem $costItem): bool
    {
        return Permissions::userMay($user, Permissions::COSTS_VIEW);
    }

    public function create(User $user): bool
    {
        return Permissions::userMay($user, Permissions::COSTS_MANAGE);
    }

    public function update(User $user, CostItem $costItem): bool
    {
        return Permissions::userMay($user, Permissions::COSTS_MANAGE);
    }

    public function archive(User $user, CostItem $costItem): bool
    {
        return Permissions::userMay($user, Permissions::COSTS_MANAGE);
    }
}
