<?php

namespace App\Actions\Routes;

use App\Enums\OperationalRouteStatus;
use App\Models\OperationalRoute;
use App\Services\Audit\AuditRecorder;
use App\Support\Routes\OperationalRouteTransitions;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class CompleteRouteAction
{
    public function execute(
        OperationalRoute $route,
        ?Authenticatable $actor,
        ?Request $request,
    ): OperationalRoute {
        return DB::transaction(function () use ($route, $actor, $request): OperationalRoute {
            $from = $route->route_status;
            OperationalRouteTransitions::assertCan($from, OperationalRouteStatus::Completed);

            $route->route_status = OperationalRouteStatus::Completed;
            $route->save();

            AuditRecorder::record($actor, $route, 'route.completed', [
                'from' => $from->value,
                'to' => OperationalRouteStatus::Completed->value,
            ], $request);

            return $route->fresh();
        });
    }
}
