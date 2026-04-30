<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\ApiResponses;
use App\Support\Permissions;
use App\Support\WorkspacePayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

final class MeController extends Controller
{
    public function show(): JsonResponse
    {
        $user = Auth::user();

        if ($user === null) {
            return ApiResponses::unauthorized();
        }

        /** @phpstan-ignore-next-line */
        $role = $user->resolvedRole();

        /** @phpstan-ignore-next-line */
        $companyRowId = $user->company_id;

        if (app()->isLocal()) {
            Log::debug('api.v1.me', [
                'clerk_user_id' => $user->clerk_user_id,
                'role' => $role->value,
                'role_bucket' => $role->isInternal() ? 'internal' : 'customer',
                /** @phpstan-ignore-next-line */
                'status' => $user->status?->value,
                /** @phpstan-ignore-next-line */
                'company_id' => $companyRowId !== null ? (string) $companyRowId : null,
            ]);
        }

        /** @phpstan-ignore-next-line */
        $perms = Permissions::forRole($role);

        /** @phpstan-ignore-next-line */
        $areas = $role->isInternal() ? WorkspacePayload::serviceAreas() : [];

        return ApiResponses::success([
            /** @phpstan-ignore-next-line */
            'user' => [
                'id' => (string) $user->id,
                'clerk_user_id' => $user->clerk_user_id,
                'email' => $user->email,
                'name' => $user->name,
                'role' => $role->value,
                /** @phpstan-ignore-next-line */
                'role_bucket' => $role->isInternal() ? 'internal' : 'customer',
                /** Tenant company binding — optional for privileged staff (super/admin). */
                'company_id' => $companyRowId !== null ? (string) $companyRowId : null,
                /** @phpstan-ignore-next-line */
                'status' => $user->status?->value,
            ],
            'permissions' => $perms,
            'workspaces' => WorkspacePayload::for($user),
            'service_areas' => $areas,
        ]);
    }
}
