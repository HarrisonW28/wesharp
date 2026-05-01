<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Enums\UserStatus;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use App\Services\Users\LastSuperAdminGuard;
use Illuminate\Http\Request;

final class DeactivateDirectoryUserAction
{
    public function execute(User $actor, User $target, ?Request $request = null): User
    {
        if ((int) $actor->getKey() === (int) $target->getKey()) {
            abort(422, 'You cannot deactivate yourself from this workspace.');
        }

        $role = $target->resolvedRole();
        /** @phpstan-ignore-next-line */
        $status = $target->status;

        if (LastSuperAdminGuard::willBeAbleSuperAdmin($role, $status)) {
            LastSuperAdminGuard::assertRemovingAbleSuperAdminIsSafe($target);
        }

        $before = ['status' => $target->status?->value];
        /** @phpstan-ignore-next-line */
        $target->status = UserStatus::Suspended;
        $target->save();

        AuditRecorder::record($actor, $target, 'user.deactivated', ['before' => $before], $request);

        return $target;
    }
}
