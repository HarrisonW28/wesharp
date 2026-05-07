<?php

namespace App\Actions\Routes;

use App\Enums\RouteStopStatus;
use App\Models\RouteStop;
use App\Support\Evidence\EvidencePhotoRequirements;
use App\Support\Routes\RouteStopBookingStatusSync;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

final class MarkRouteStopReturnedAction
{
    use MarkRouteStopTrait;

    public function execute(RouteStop $stop, ?Authenticatable $actor, ?Request $request): RouteStop
    {
        EvidencePhotoRequirements::assertForReturned($stop);

        return $this->transitionStop(
            $stop,
            RouteStopStatus::Returned,
            'route_stop.returned',
            $actor,
            $request,
            [],
            ['return_completed_at' => now()],
            static function (RouteStop $fresh) use ($actor, $request): void {
                RouteStopBookingStatusSync::afterStopReturned($fresh, $actor, $request);
            },
        );
    }
}
