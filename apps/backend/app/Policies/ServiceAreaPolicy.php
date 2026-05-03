<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ServiceArea;
use App\Models\User;
use App\Support\Permissions;

final class ServiceAreaPolicy
{
    public function viewAny(User $user): bool
    {
        return Permissions::userMay($user, Permissions::SERVICE_AREAS_VIEW);
    }

    public function view(User $user, ServiceArea $serviceArea): bool
    {
        return Permissions::userMay($user, Permissions::SERVICE_AREAS_VIEW);
    }

    public function create(User $user): bool
    {
        return Permissions::userMay($user, Permissions::SERVICE_AREAS_MANAGE);
    }

    public function update(User $user, ServiceArea $serviceArea): bool
    {
        return Permissions::userMay($user, Permissions::SERVICE_AREAS_MANAGE);
    }

    public function delete(User $user, ServiceArea $serviceArea): bool
    {
        return Permissions::userMay($user, Permissions::SERVICE_AREAS_MANAGE);
    }
}
