<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\AuditLog;
use App\Models\User;
use App\Support\Permissions;

final class AuditLogPolicy
{
    public function viewAny(User $user): bool
    {
        return Permissions::userMay($user, Permissions::AUDIT_LOGS_VIEW);
    }

    public function view(User $user, AuditLog $auditLog): bool
    {
        return Permissions::userMay($user, Permissions::AUDIT_LOGS_VIEW);
    }
}
