<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\Clerk\ClerkTokenException;
use App\Services\Clerk\ClerkUserSynchronizer;
use App\Support\ApiResponses;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Validates Clerk Bearer JWTs for API routes and attaches the synced {@see User}.
 */
final class AuthenticateClerkJwt
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            if (App::runningUnitTests()) {
                $header = config('clerk.testing_bypass_header', 'X-WeSharp-Test-User-Id');
                $id = $request->header($header);
                if (is_numeric($id)) {
                    /** @var User|null $user */
                    $user = User::query()->find((int) $id);
                    if ($user !== null) {
                        Auth::guard('web')->setUser($user);

                        return $next($request);
                    }
                }
            }

            $user = resolve(ClerkUserSynchronizer::class)->userFromBearer(
                $request->headers->get('Authorization')
            );

            Auth::guard('web')->setUser($user);
        } catch (ClerkTokenException $e) {
            return ApiResponses::unauthorized($e->getMessage(), $e->apiCode());
        }

        return $next($request);
    }
}
