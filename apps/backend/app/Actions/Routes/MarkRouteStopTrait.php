<?php

namespace App\Actions\Routes;

use App\Enums\RouteStopStatus;
use App\Models\RouteStop;
use App\Services\Audit\AuditRecorder;
use App\Support\Routes\RouteStopTransitions;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

trait MarkRouteStopTrait
{
    /**
     * @param  array<string, mixed>  $auditExtra
     * @param  array<string, mixed>  $columns
     * @param  (callable(RouteStop): void)|null  $afterTransition  Runs in the same transaction after audit (e.g. booking sync).
     */
    protected function transitionStop(
        RouteStop $stop,
        RouteStopStatus $target,
        string $auditAction,
        ?Authenticatable $actor,
        ?Request $request,
        array $auditExtra = [],
        array $columns = [],
        ?callable $afterTransition = null,
    ): RouteStop {
        return DB::transaction(function () use ($stop, $target, $auditAction, $actor, $request, $auditExtra, $columns, $afterTransition): RouteStop {
            $stop->refresh();

            $from = $stop->route_stop_status;
            RouteStopTransitions::assertCan($from, $target);

            $stop->route_stop_status = $target;

            foreach ($columns as $key => $value) {
                $stop->{$key} = $value;
            }

            $stop->save();

            AuditRecorder::record($actor, $stop, $auditAction, array_merge([
                'from' => $from->value,
                'to' => $target->value,
            ], $auditExtra), $request);

            if ($afterTransition !== null) {
                $fresh = $stop->fresh();
                if ($fresh !== null) {
                    $afterTransition($fresh);
                }
            }

            return $stop->fresh();
        });
    }
}
