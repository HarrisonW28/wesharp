<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminUpdateUserRequest;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class UserDirectoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $perPage = min(75, max(1, (int) $request->query('per_page', 25)));

        $q = User::query()->orderByDesc('updated_at')->with('company:id,name,city');

        if (($s = trim((string) $request->query('q', ''))) !== '') {
            $q->where(function ($sub) use ($s): void {
                $sub->where('name', 'like', '%'.$s.'%')
                    ->orWhere('email', 'like', '%'.$s.'%')
                    ->orWhere('clerk_user_id', 'like', '%'.$s.'%');
            });
        }

        if (($role = trim((string) $request->query('role', ''))) !== '') {
            $q->where('role', $role);
        }

        if (($st = trim((string) $request->query('status', ''))) !== '') {
            $q->where('status', $st);
        }

        if (($cid = trim((string) $request->query('company_id', ''))) !== '') {
            $q->where('company_id', $cid);
        }

        $paginator = $q->paginate($perPage)->withQueryString();

        /** @phpstan-ignore-next-line */
        $paginator->getCollection()->transform(function (User $u): array {
            return [
                'id' => (string) $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'clerk_user_id' => $u->clerk_user_id,
                'role' => $u->resolvedRole()->value,
                'status' => $u->status?->value,
                'company_id' => $u->company_id !== null ? (string) $u->company_id : null,
                'company_name' => $u->company?->name,
            ];
        });

        return ApiResponses::paginated($paginator, 'items');
    }

    public function show(Request $request, User $target): JsonResponse
    {
        $this->authorize('view', $target);

        $target->load('company:id,name,city');

        return ApiResponses::success([
            'id' => (string) $target->id,
            'name' => $target->name,
            'email' => $target->email,
            'clerk_user_id' => $target->clerk_user_id,
            'role' => $target->resolvedRole()->value,
            'status' => $target->status?->value,
            'company_id' => $target->company_id !== null ? (string) $target->company_id : null,
            'company' => $target->company !== null ? [
                'id' => (string) $target->company->id,
                'name' => $target->company->name,
                'city' => $target->company->city,
            ] : null,
            'created_at' => $target->created_at?->toIso8601String(),
            'updated_at' => $target->updated_at?->toIso8601String(),
        ]);
    }

    public function update(AdminUpdateUserRequest $request, User $target): JsonResponse
    {
        $this->authorize('update', $target);

        $validated = $request->validated();
        $actor = $request->user();

        /** @phpstan-ignore-next-line */
        $from = [
            'role' => $target->resolvedRole()->value,
            'status' => $target->status?->value,
            'company_id' => $target->company_id !== null ? (string) $target->company_id : null,
        ];

        if (array_key_exists('role', $validated) && $validated['role'] !== null) {
            $newRole = UserRole::from((string) $validated['role']);

            if ((int) $actor?->getAuthIdentifier() === (int) $target->getKey()
                && $from['role'] === UserRole::SuperAdmin->value
                && $newRole !== UserRole::SuperAdmin
            ) {
                if (($validated['confirm_super_demotion'] ?? null) !== 'REMOVE_MY_SUPER_ACCESS') {
                    abort(422, 'Type confirm_super_demotion=REMOVE_MY_SUPER_ACCESS to demote your own super admin access.');
                }
            }

            $target->role = $newRole;
        }

        if (array_key_exists('status', $validated) && $validated['status'] !== null) {
            $target->status = UserStatus::from((string) $validated['status']);
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

        $after = [
            'role' => $target->resolvedRole()->value,
            'status' => $target->status?->value,
            /** @phpstan-ignore-next-line */
            'company_id' => $target->company_id !== null ? (string) $target->company_id : null,
        ];

        AuditRecorder::record($actor, $target, 'user.admin_updated', [
            'before' => $from,
            'after' => $after,
        ], $request);

        return ApiResponses::success([
            'id' => (string) $target->id,
            'role' => $after['role'],
            'status' => $after['status'],
            'company_id' => $after['company_id'],
        ]);
    }

    /** Soft delete / suspend via status for MVP — keeps audit trail. */
    public function deactivate(Request $request, User $target): JsonResponse
    {
        $this->authorize('update', $target);

        if ((int) $request->user()?->getAuthIdentifier() === (int) $target->getKey()) {
            abort(422, 'You cannot deactivate yourself from this workspace.');
        }

        $before = ['status' => $target->status?->value];
        /** @phpstan-ignore-next-line */
        $target->status = UserStatus::Suspended;
        $target->save();

        AuditRecorder::record($request->user(), $target, 'user.deactivated', ['before' => $before], $request);

        return ApiResponses::success(['status' => $target->status?->value]);
    }

    public function activate(Request $request, User $target): JsonResponse
    {
        $this->authorize('update', $target);

        $before = ['status' => $target->status?->value];
        /** @phpstan-ignore-next-line */
        $target->status = UserStatus::Active;
        $target->save();

        AuditRecorder::record($request->user(), $target, 'user.activated', ['before' => $before], $request);

        return ApiResponses::success(['status' => $target->status?->value]);
    }
}
