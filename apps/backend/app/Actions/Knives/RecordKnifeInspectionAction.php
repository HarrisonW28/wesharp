<?php

namespace App\Actions\Knives;

use App\Models\Knife;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class RecordKnifeInspectionAction
{
    private const KEYS = [
        'inspection_condition',
        'inspection_notes',
        'inspection_internal_notes',
        'inspection_customer_visible',
    ];

    /**
     * @param  array<string, mixed>  $validated
     */
    public function execute(Knife $knife, array $validated, User $actor, Request $request): Knife
    {
        return DB::transaction(function () use ($knife, $validated, $actor, $request): Knife {
            $knife->refresh();

            $before = $knife->only(self::KEYS);
            $beforeVisible = (bool) $knife->inspection_customer_visible;

            foreach (self::KEYS as $key) {
                if (array_key_exists($key, $validated)) {
                    $knife->{$key} = $validated[$key];
                }
            }

            $knife->inspected_by_user_id = $actor->getKey();
            $knife->inspected_at = now();
            $knife->save();

            $after = $knife->only([...self::KEYS, 'inspected_by_user_id', 'inspected_at']);

            AuditRecorder::record($actor, $knife, 'knife.inspection_updated', [
                'before' => $before,
                'after' => $after,
            ], $request);

            $afterVisible = (bool) $knife->inspection_customer_visible;
            if ($beforeVisible !== $afterVisible) {
                AuditRecorder::record($actor, $knife, 'knife.inspection_visibility_changed', [
                    'before' => $beforeVisible,
                    'after' => $afterVisible,
                ], $request);
            }

            return $knife->fresh();
        });
    }
}
