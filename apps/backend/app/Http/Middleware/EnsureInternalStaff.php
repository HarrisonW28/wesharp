<?php

namespace App\Http\Middleware;

use App\Support\ApiResponses;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Allows only internal operations roles (staff). Optional route parameters narrow to specific role values.
 *
 * Example: `staff:super_admin|admin` passes when the signed-in user holds one of those roles.
 */
final class EnsureInternalStaff
{
    /**
     * @param  string|null  $roleFilter  Pipe-separated role values, e.g. "super_admin|admin"
     */
    public function handle(Request $request, Closure $next, ?string $roleFilter = null): Response
    {
        $user = $request->user();

        if ($user === null) {
            return ApiResponses::unauthorized();
        }

        $resolved = $user->resolvedRole();

        if (! $resolved->isInternal()) {
            return ApiResponses::forbidden();
        }

        if ($roleFilter !== null && $roleFilter !== '') {
            $allowed = collect(explode('|', $roleFilter))
                ->map(static fn (string $s) => trim($s))
                ->filter()
                ->values()
                ->all();

            if ($allowed !== [] && ! in_array($resolved->value, $allowed, true)) {
                return ApiResponses::forbidden();
            }
        }

        return $next($request);
    }
}
