<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Requests\Admin\AdminUpdateUserRequest;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use App\Services\Users\LastSuperAdminGuard;
use Illuminate\Http\Request;

final class UpdateDirectoryUserAction
{
    /**
     * @param  array<string, mixed>  $validated  From {@see AdminUpdateUserRequest}
     */
    public function execute(User $actor, User $target, array $validated, ?Request $request = null): User
    {
        $fromRole = $target->resolvedRole();
        /** @phpstan-ignore-next-line */
        $fromStatus = $target->status;
        /** @phpstan-ignore-next-line */
        $fromCompanyId = $target->company_id !== null ? (string) $target->company_id : null;

        $newRole = array_key_exists('role', $validated) && $validated['role'] !== null
            ? UserRole::from((string) $validated['role'])
            : $fromRole;
        $newStatus = array_key_exists('status', $validated) && $validated['status'] !== null
            ? UserStatus::from((string) $validated['status'])
            : $fromStatus;

        $currentlyAbleSuper = LastSuperAdminGuard::willBeAbleSuperAdmin($fromRole, $fromStatus);
        $futureAbleSuper = LastSuperAdminGuard::willBeAbleSuperAdmin($newRole, $newStatus);

        if ($currentlyAbleSuper && ! $futureAbleSuper) {
            LastSuperAdminGuard::assertRemovingAbleSuperAdminIsSafe($target);
        }

        if ((int) $actor->getKey() === (int) $target->getKey()
            && $fromRole === UserRole::SuperAdmin
            && $newRole !== UserRole::SuperAdmin
        ) {
            if (($validated['confirm_super_demotion'] ?? null) !== 'REMOVE_MY_SUPER_ACCESS') {
                abort(422, 'Type confirm_super_demotion=REMOVE_MY_SUPER_ACCESS to demote your own super admin access.');
            }
        }

        if (array_key_exists('role', $validated) && $validated['role'] !== null) {
            $target->role = $newRole;
        }

        if (array_key_exists('status', $validated) && $validated['status'] !== null) {
            $target->status = $newStatus;
        }

        if (array_key_exists('company_id', $validated)) {
            if ($validated['company_id'] === null || $validated['company_id'] === '') {
                if ($target->resolvedRole()->isCustomer()) {
                    abort(422, 'Customer roles require a company binding.');
                }
                $target->company_id = null;
            } else {
                /** @phpstan-ignore-next-line */
                $target->company_id = (string) $validated['company_id'];
            }
        }

        $target->save();

        $afterRole = $target->resolvedRole();
        /** @phpstan-ignore-next-line */
        $afterStatus = $target->status;
        /** @phpstan-ignore-next-line */
        $afterCompanyId = $target->company_id !== null ? (string) $target->company_id : null;

        if ($fromRole !== $afterRole) {
            AuditRecorder::record($actor, $target, 'user.role_changed', [
                'before' => $fromRole->value,
                'after' => $afterRole->value,
            ], $request);
        }

        /** @phpstan-ignore-next-line */
        if ($fromStatus !== $afterStatus) {
            AuditRecorder::record($actor, $target, 'user.status_changed', [
                'before' => $fromStatus?->value,
                'after' => $afterStatus?->value,
            ], $request);
        }

        if ($fromCompanyId !== $afterCompanyId) {
            AuditRecorder::record($actor, $target, 'user.company_assignment_changed', [
                'before' => $fromCompanyId,
                'after' => $afterCompanyId,
            ], $request);
        }

        return $target->fresh(['company:id,name,city']) ?? $target;
    }
}
