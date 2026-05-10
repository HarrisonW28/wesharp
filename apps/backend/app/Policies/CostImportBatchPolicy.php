<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\CostImportBatch;
use App\Models\User;
use App\Support\Permissions;

final class CostImportBatchPolicy
{
    public function viewAny(User $user): bool
    {
        return Permissions::userMay($user, Permissions::COSTS_VIEW);
    }

    public function view(User $user, CostImportBatch $batch): bool
    {
        return Permissions::userMay($user, Permissions::COSTS_VIEW);
    }

    public function create(User $user): bool
    {
        return Permissions::userMay($user, Permissions::COSTS_MANAGE);
    }

    public function commit(User $user, CostImportBatch $batch): bool
    {
        return Permissions::userMay($user, Permissions::COSTS_MANAGE);
    }
}
