<?php

namespace App\Actions\Routes;

use App\Enums\RouteStopStatus;
use App\Models\RouteStop;
use App\Support\Evidence\EvidencePhotoRequirements;
use App\Support\Routes\RouteStopBookingStatusSync;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

final class MarkRouteStopSkippedAction
{
    use MarkRouteStopTrait;

    /**
     * @param  array<string, mixed>|null  $failureMeta  e.g. photo placeholder flags for future sprints.
     */
    public function execute(
        RouteStop $stop,
        ?Authenticatable $actor,
        ?Request $request,
        string $failureReason,
        ?string $failureNotes,
        ?array $failureMeta,
    ): RouteStop {
        $notes = $failureNotes !== null && trim($failureNotes) !== '' ? trim($failureNotes) : null;

        EvidencePhotoRequirements::assertForFailedCollection($stop);

        return $this->transitionStop(
            $stop,
            RouteStopStatus::Skipped,
            'route_stop.failed_collection',
            $actor,
            $request,
            [
                'failure_reason' => $failureReason,
                'failure_notes' => $notes,
                'failure_meta' => $failureMeta,
            ],
            [
                'failure_reason' => $failureReason,
                'failure_notes' => $notes,
                'failure_meta' => $failureMeta,
            ],
            static function (RouteStop $fresh) use ($actor, $request): void {
                RouteStopBookingStatusSync::afterStopFailed($fresh, $actor, $request);
            },
        );
    }
}
