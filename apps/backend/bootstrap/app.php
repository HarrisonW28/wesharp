<?php

use App\Http\Middleware\AuthenticateClerkJwt;
use App\Http\Middleware\EnsureCorrelationId;
use App\Http\Middleware\EnsureInternalStaff;
use App\Http\Middleware\EnsurePermission;
use App\Http\Middleware\EnsureTenantCustomer;
use App\Support\ApiResponses;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'correlation' => EnsureCorrelationId::class,
            'clerk.auth' => AuthenticateClerkJwt::class,
            'staff' => EnsureInternalStaff::class,
            'tenant' => EnsureTenantCustomer::class,
            'permission' => EnsurePermission::class,
        ]);

        $middleware->api(prepend: [
            EnsureCorrelationId::class,
        ]);
    })
    ->withSchedule(function (Schedule $schedule): void {
        // Production: run `php artisan schedule:run` every minute (cron/worker scheduler).
        // Example: $schedule->command('something')->daily();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontReportDuplicates();

        $exceptions->context(static function (): array {
            $id = Context::get('request_id');

            return is_string($id) && $id !== '' ? ['request_id' => $id] : [];
        });

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request): bool => $request->is(['api', 'api/*'])
                || $request->expectsJson(),
        );

        $exceptions->renderable(function (ValidationException $exception, Request $request) {
            if (! $request->is(['api', 'api/*'])) {
                return null;
            }

            return ApiResponses::validationError($exception);
        });

        $exceptions->renderable(function (AuthenticationException $exception, Request $request) {
            if (! $request->is(['api', 'api/*'])) {
                return null;
            }

            return ApiResponses::unauthorized();
        });

        $exceptions->renderable(function (AuthorizationException $exception, Request $request) {
            if (! $request->is(['api', 'api/*'])) {
                return null;
            }

            return ApiResponses::forbidden();
        });
    })->create();
