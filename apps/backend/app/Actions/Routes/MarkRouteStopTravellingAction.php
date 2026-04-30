<?php

namespace App\Actions\Routes;

use App\Enums\RouteStopStatus;
use App\Models\RouteStop;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

final class MarkRouteStopTravellingAction
{
    use MarkRouteStopTrait;

    public function execute(RouteStop $stop, ?Authenticatable $actor, ?Request $request): RouteStop
    {
        return $this->transitionStop($stop, RouteStopStatus::Travelling, 'route_stop.travelling', $actor, $request);
    }
}
