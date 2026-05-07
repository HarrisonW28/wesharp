<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Routes\CompleteRouteStopAction;
use App\Actions\Routes\MarkRouteStopArrivedAction;
use App\Actions\Routes\MarkRouteStopCollectedAction;
use App\Actions\Routes\MarkRouteStopReturnedAction;
use App\Actions\Routes\MarkRouteStopSkippedAction;
use App\Actions\Routes\MarkRouteStopTravellingAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\MarkRouteStopSkippedRequest;
use App\Http\Requests\UpdateRouteStopRequest;
use App\Models\RouteStop;
use App\Services\Audit\AuditRecorder;
use App\Services\Orders\OrderService;
use App\Support\ApiResponses;
use App\Support\Routes\RouteFormatting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class RouteStopController extends Controller
{
    public function __construct(
        private readonly MarkRouteStopTravellingAction $markRouteStopTravellingAction,
        private readonly MarkRouteStopArrivedAction $markRouteStopArrivedAction,
        private readonly MarkRouteStopCollectedAction $markRouteStopCollectedAction,
        private readonly MarkRouteStopReturnedAction $markRouteStopReturnedAction,
        private readonly MarkRouteStopSkippedAction $markRouteStopSkippedAction,
        private readonly CompleteRouteStopAction $completeRouteStopAction,
    ) {}

    public function show(Request $request, RouteStop $stop): JsonResponse
    {
        $this->authorize('view', $stop);

        return ApiResponses::success(RouteFormatting::stopDetail($stop));
    }

    public function update(UpdateRouteStopRequest $request, RouteStop $stop): JsonResponse
    {
        $this->authorize('manage', $stop);

        $validated = $request->validated();

        $before = $stop->only(['actual_knife_count', 'damage_notes']);

        DB::transaction(function () use ($stop, $validated, $request, $before): void {
            $stop->fill($validated);
            $stop->save();

            $booking = $stop->booking;
            if ($booking !== null && array_key_exists('actual_knife_count', $validated)) {
                $booking->actual_knife_count = $stop->actual_knife_count;
                $booking->save();

                $order = $booking->orders()->latest('created_at')->first();
                if ($order !== null) {
                    $order->knife_count = max(0, (int) ($stop->actual_knife_count ?? 0));
                    $order->save();
                    app(OrderService::class)->rebuildMonetaryTotals($order->fresh(['knives', 'items', 'booking']));
                }
            }

            AuditRecorder::record($request->user(), $stop, 'route_stop.updated', [
                'before' => $before,
                'after' => $stop->only(['actual_knife_count', 'damage_notes']),
            ], $request);
        });

        return ApiResponses::success(RouteFormatting::stopDetail($stop->fresh()));
    }

    public function markTravelling(Request $request, RouteStop $stop): JsonResponse
    {
        $this->authorize('manage', $stop);

        $stop = $this->markRouteStopTravellingAction->execute($stop, $request->user(), $request);

        return ApiResponses::success(RouteFormatting::stopDetail($stop));
    }

    public function markArrived(Request $request, RouteStop $stop): JsonResponse
    {
        $this->authorize('manage', $stop);

        $stop = $this->markRouteStopArrivedAction->execute($stop, $request->user(), $request);

        return ApiResponses::success(RouteFormatting::stopDetail($stop));
    }

    public function markCollected(Request $request, RouteStop $stop): JsonResponse
    {
        $this->authorize('manage', $stop);

        $stop = $this->markRouteStopCollectedAction->execute($stop, $request->user(), $request);

        return ApiResponses::success(RouteFormatting::stopDetail($stop));
    }

    public function markReturned(Request $request, RouteStop $stop): JsonResponse
    {
        $this->authorize('manage', $stop);

        $stop = $this->markRouteStopReturnedAction->execute($stop, $request->user(), $request);

        return ApiResponses::success(RouteFormatting::stopDetail($stop));
    }

    public function markSkipped(MarkRouteStopSkippedRequest $request, RouteStop $stop): JsonResponse
    {
        $this->authorize('manage', $stop);

        $payload = $request->validatedPayload();

        $stop = $this->markRouteStopSkippedAction->execute(
            $stop,
            $request->user(),
            $request,
            $payload['failure_reason'],
            $payload['failure_notes'],
            $payload['failure_meta'],
        );

        return ApiResponses::success(RouteFormatting::stopDetail($stop));
    }

    public function complete(Request $request, RouteStop $stop): JsonResponse
    {
        $this->authorize('manage', $stop);

        $stop = $this->completeRouteStopAction->execute($stop, $request->user(), $request);

        return ApiResponses::success(RouteFormatting::stopDetail($stop));
    }
}
