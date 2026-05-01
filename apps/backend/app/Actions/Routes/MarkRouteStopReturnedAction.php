<?php

namespace App\Actions\Routes;

use App\Enums\RouteStopStatus;
use App\Models\RouteStop;
use App\Support\Evidence\EvidencePhotoRequirements;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

final class MarkRouteStopReturnedAction
{
    use MarkRouteStopTrait;

    public function execute(RouteStop $stop, ?Authenticatable $actor, ?Request $request): RouteStop
    {
        EvidencePhotoRequirements::assertForReturned($stop);

        return $this->transitionStop($stop, RouteStopStatus::Returned, 'route_stop.returned', $actor, $request);
    }
}
