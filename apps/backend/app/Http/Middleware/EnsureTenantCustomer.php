<?php

namespace App\Http\Middleware;

use App\Support\ApiResponses;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureTenantCustomer
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $role = $user?->resolvedRole();

        if ($user === null || $role === null) {
            return ApiResponses::unauthorized();
        }

        if (! $role->isCustomer()) {
            return ApiResponses::forbidden('This workspace is restricted to tenant users.');
        }

        if ($user->company_id === null && $role->isCustomer()) {
            return ApiResponses::forbidden('Tenant user is not assigned to a company.');
        }

        return $next($request);
    }
}
