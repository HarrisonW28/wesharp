<?php

declare(strict_types=1);

namespace App\Services\Users;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;

/**
 * Ensures at least one non-suspended {@see UserRole::SuperAdmin} always remains.
 */
final class LastSuperAdminGuard
{
    public static function willBeAbleSuperAdmin(UserRole $role, ?UserStatus $status): bool
    {
        return $role === UserRole::SuperAdmin && $status !== UserStatus::Suspended;
    }

    /** Super admins that can sign in to staff tooling (not suspended). */
    public static function countAbleSuperAdminsExcluding(?int $excludingUserId = null): int
    {
        $q = User::query()
            ->where('role', UserRole::SuperAdmin)
            ->whereNot('status', UserStatus::Suspended);

        if ($excludingUserId !== null) {
            $q->where('id', '!=', $excludingUserId);
        }

        return $q->count();
    }

    /**
     * Call when an update would remove this user's “able super admin” status (demotion, suspend, or both).
     */
    public static function assertRemovingAbleSuperAdminIsSafe(User $target): void
    {
        if (self::countAbleSuperAdminsExcluding((int) $target->getKey()) < 1) {
            abort(422, 'Cannot remove or suspend the last active super admin.');
        }
    }
}
