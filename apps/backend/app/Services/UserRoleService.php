<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use LogicException;

/**
 * Role changes MUST go through this service — audit hooks live here only.
 */
final class UserRoleService
{
    public function updateRoleForUser(User $subject, UserRole $targetRole, ?string $ipAddress = null): User
    {
        $actor = Auth::user();

        if ($actor === null) {
            throw new LogicException('Acting actor is required.');
        }

        if (! Permissions::userMay($actor, Permissions::SETTINGS_MANAGE)) {
            throw new LogicException('Actor lacks settings.manage.');
        }

        return DB::transaction(function () use ($subject, $targetRole, $actor, $ipAddress): User {
            $previous = $subject->role?->value;

            $subject->role = $targetRole;
            $subject->save();

            AuditLog::query()->create([
                'actor_id' => $actor->getKey(),
                'subject_user_id' => $subject->getKey(),
                'action' => 'user.role.updated',
                'auditable_type' => User::class,
                'auditable_id' => (string) $subject->getKey(),
                'payload' => [
                    'from_role' => $previous,
                    'to_role' => $targetRole->value,
                ],
                'ip_address' => $ipAddress,
                'created_at' => now(),
            ]);

            return $subject->refresh();
        });
    }
}
