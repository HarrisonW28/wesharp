<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Consumable;
use App\Models\User;
use App\Support\Permissions;

final class ConsumablePolicy
{
    public function viewAny(User $user): bool
    {
        return Permissions::userMay($user, Permissions::COSTS_VIEW);
    }

    public function view(User $user, Consumable $consumable): bool
    {
        return Permissions::userMay($user, Permissions::COSTS_VIEW);
    }

    public function update(User $user, Consumable $consumable): bool
    {
        return Permissions::userMay($user, Permissions::COSTS_MANAGE);
    }

    public function logUsage(User $user, Consumable $consumable): bool
    {
        return Permissions::userMay($user, Permissions::COSTS_MANAGE);
    }
}
