<?php

namespace App\Actions\Routes;

use App\Enums\RouteStopStatus;
use App\Models\RouteStop;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

final class MarkRouteStopCollectedAction
{
    use MarkRouteStopTrait;

    public function execute(RouteStop $stop, ?Authenticatable $actor, ?Request $request): RouteStop
    {
        return $this->transitionStop($stop, RouteStopStatus::Collected, 'route_stop.collected', $actor, $request, [], [
            'departed_at' => now(),
        ]);
    }
}
