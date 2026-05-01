<?php

namespace App\Actions\Routes;

use App\Enums\RouteStopStatus;
use App\Models\RouteStop;
use App\Support\Routes\RouteStopBookingStatusSync;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

final class CompleteRouteStopAction
{
    use MarkRouteStopTrait;

    public function execute(RouteStop $stop, ?Authenticatable $actor, ?Request $request): RouteStop
    {
        return $this->transitionStop(
            $stop,
            RouteStopStatus::Completed,
            'route_stop.completed',
            $actor,
            $request,
            [],
            [],
            static function (RouteStop $fresh) use ($actor, $request): void {
                RouteStopBookingStatusSync::afterStopCompleted($fresh, $actor, $request);
            },
        );
    }
}
