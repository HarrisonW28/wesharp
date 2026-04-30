<?php

namespace App\Actions\Knives;

use App\Enums\KnifeStatus;
use App\Models\Knife;
use App\Services\Audit\AuditRecorder;
use App\Support\Knives\KnifeStatusTransitions;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

trait MarkKnifeTrait
{
    /**
     * @param  array<string, mixed>  $columnPatches
     * @param  array<string, mixed>  $auditExtra
     */
    protected function transitionKnife(
        Knife $knife,
        KnifeStatus $target,
        string $auditAction,
        ?Authenticatable $actor,
        ?Request $request,
        array $columnPatches = [],
        array $auditExtra = [],
    ): Knife {
        return DB::transaction(function () use ($knife, $target, $auditAction, $actor, $request, $columnPatches, $auditExtra): Knife {
            $knife->refresh();
            $from = $knife->knife_status;

            KnifeStatusTransitions::assertCan($from, $target);

            $knife->knife_status = $target;

            foreach ($columnPatches as $key => $value) {
                $knife->{$key} = $value;
            }

            $knife->save();

            AuditRecorder::record($actor, $knife, $auditAction, array_merge([
                'from' => $from->value,
                'to' => $target->value,
            ], $auditExtra), $request);

            return $knife->fresh();
        });
    }
}
