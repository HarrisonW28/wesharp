<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\ApiResponses;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

final class MeController extends Controller
{
    public function show(): JsonResponse
    {
        $user = Auth::user();

        if ($user === null) {
            return ApiResponses::unauthorized();
        }

        $role = $user->resolvedRole();

        return ApiResponses::success([
            'user' => [
                'id' => (string) $user->id,
                'clerk_user_id' => $user->clerk_user_id,
                'email' => $user->email,
                'name' => $user->name,
                'role' => $role->value,
                'role_bucket' => $role->isInternal() ? 'internal' : 'customer',
                'company_id' => $user->company_id,
                'status' => $user->status?->value,
            ],
            'permissions' => Permissions::forRole($role),
        ]);
    }
}
