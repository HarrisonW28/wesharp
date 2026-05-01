<?php

namespace App\Actions\Routes;

use App\Enums\RouteStopStatus;
use App\Models\RouteStop;
use App\Support\Evidence\EvidencePhotoRequirements;
use App\Support\Routes\RouteStopBookingStatusSync;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

final class MarkRouteStopCollectedAction
{
    use MarkRouteStopTrait;

    public function execute(RouteStop $stop, ?Authenticatable $actor, ?Request $request): RouteStop
    {
        EvidencePhotoRequirements::assertForCollected($stop);

        return $this->transitionStop(
            $stop,
            RouteStopStatus::Collected,
            'route_stop.collected',
            $actor,
            $request,
            [],
            ['departed_at' => now()],
            static function (RouteStop $fresh) use ($actor, $request): void {
                RouteStopBookingStatusSync::afterStopCollected($fresh, $actor, $request);
            },
        );
    }
}
