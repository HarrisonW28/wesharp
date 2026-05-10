<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\ApiResponses;
use App\Support\Permissions;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureAnyPermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if ($user === null) {
            return ApiResponses::unauthorized();
        }

        foreach ($permissions as $permission) {
            if ($permission !== '' && Permissions::userMay($user, $permission)) {
                return $next($request);
            }
        }

        return ApiResponses::forbidden();
    }
}
