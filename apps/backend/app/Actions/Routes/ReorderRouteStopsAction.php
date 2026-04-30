<?php

namespace App\Actions\Routes;

use App\Models\OperationalRoute;
use App\Models\RouteStop;
use App\Services\Audit\AuditRecorder;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ReorderRouteStopsAction
{
    /**
     * @param  list<string>  $stopIdsInOrder
     */
    public function execute(
        OperationalRoute $route,
        array $stopIdsInOrder,
        ?Authenticatable $actor,
        ?Request $request,
    ): void {
        DB::transaction(function () use ($route, $stopIdsInOrder, $actor, $request): void {
            $existing = RouteStop::query()
                ->where('route_id', $route->id)
                ->pluck('id')
                ->map(static fn ($id) => (string) $id)
                ->all();

            $payloadIds = collect($stopIdsInOrder)->map(static fn ($id) => (string) $id)->sort()->values()->all();
            $existingIds = collect($existing)->sort()->values()->all();

            if ($payloadIds !== $existingIds) {
                abort(422, 'Reorder payload must contain exactly the stops on this route.');
            }

            foreach ($stopIdsInOrder as $sequence => $id) {
                RouteStop::query()
                    ->where('route_id', $route->id)
                    ->where('id', (string) $id)
                    ->update(['sequence' => $sequence + 1]);
            }

            AuditRecorder::record($actor, $route, 'route.stops_reordered', [
                'order' => $stopIdsInOrder,
            ], $request);
        });
    }
}
