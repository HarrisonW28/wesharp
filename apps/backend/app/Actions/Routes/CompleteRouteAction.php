<?php

namespace App\Actions\Routes;

use App\Enums\OperationalRouteStatus;
use App\Models\OperationalRoute;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use App\Support\Permissions;
use App\Support\Routes\OperationalRouteTransitions;
use App\Support\Routes\RouteCompletionSummary;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class CompleteRouteAction
{
    public function execute(
        OperationalRoute $route,
        ?Authenticatable $actor,
        ?Request $request,
        bool $forceComplete = false,
    ): OperationalRoute {
        return DB::transaction(function () use ($route, $actor, $request, $forceComplete): OperationalRoute {
            $route->refresh();
            $route->load(['stops.booking.orders', 'stops.booking.company:id,name']);

            $viewer = $actor instanceof User ? $actor : null;
            $summary = RouteCompletionSummary::build($route, $viewer);

            if ($summary['blocks_completion']) {
                if (! $forceComplete) {
                    throw new HttpResponseException(ApiResponses::error(
                        'Route cannot be completed until all stops are resolved and required photos are present.',
                        'route_completion_blocked',
                        422,
                        ['summary' => $summary],
                    ));
                }

                if ($viewer === null || ! Permissions::userMay($viewer, Permissions::ROUTES_COMPLETE_OVERRIDE)) {
                    throw new HttpResponseException(ApiResponses::forbidden(
                        'You do not have permission to override route completion requirements.',
                        'route_completion_override_forbidden',
                    ));
                }
            }

            $from = $route->route_status;
            OperationalRouteTransitions::assertCan($from, OperationalRouteStatus::Completed);

            $route->route_status = OperationalRouteStatus::Completed;
            $route->completed_at = now();
            $route->save();

            AuditRecorder::record($actor, $route, 'route.completed', [
                'from' => $from->value,
                'to' => OperationalRouteStatus::Completed->value,
                'completed_at' => $route->completed_at?->toIso8601String(),
                'summary' => $summary,
                'force_complete' => $forceComplete && (bool) $summary['blocks_completion'],
            ], $request);

            return $route->fresh();
        });
    }
}
