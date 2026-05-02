<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Support\Permissions;

final class WebhookInboxPolicy
{
    public function viewAny(User $user): bool
    {
        return Permissions::userMay($user, Permissions::AUDIT_LOGS_VIEW);
    }
}
