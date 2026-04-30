<?php

namespace App\Http\Middleware;

use App\Support\ApiResponses;
use App\Support\Permissions;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsurePermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if ($user === null) {
            return ApiResponses::unauthorized();
        }

        if (! Permissions::userMay($user, $permission)) {
            return ApiResponses::forbidden();
        }

        return $next($request);
    }
}
