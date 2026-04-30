<?php

namespace App\Actions\Routes;

use App\Enums\OperationalRouteStatus;
use App\Models\OperationalRoute;
use App\Services\Audit\AuditRecorder;
use App\Support\Routes\OperationalRouteTransitions;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class StartRouteAction
{
    public function execute(
        OperationalRoute $route,
        ?Authenticatable $actor,
        ?Request $request,
    ): OperationalRoute {
        return DB::transaction(function () use ($route, $actor, $request): OperationalRoute {
            $from = $route->route_status;
            OperationalRouteTransitions::assertCan($from, OperationalRouteStatus::InProgress);

            $route->route_status = OperationalRouteStatus::InProgress;
            $route->save();

            AuditRecorder::record($actor, $route, 'route.started', [
                'from' => $from->value,
                'to' => OperationalRouteStatus::InProgress->value,
            ], $request);

            return $route->fresh();
        });
    }
}
