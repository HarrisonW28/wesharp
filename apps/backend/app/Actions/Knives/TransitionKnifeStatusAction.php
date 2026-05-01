<?php

declare(strict_types=1);

namespace App\Actions\Knives;

use App\Enums\KnifeStatus;
use App\Models\Knife;
use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

/** Generic workshop status move (same rules as mark-* endpoints). */
final class TransitionKnifeStatusAction
{
    use MarkKnifeTrait;

    public function execute(
        Knife $knife,
        KnifeStatus $target,
        ?Authenticatable $actor,
        ?Request $request,
        ?string $note = null,
    ): Knife {
        $patches = $this->patchesForTarget($target, $actor);
        $extra = [];
        if ($note !== null && trim($note) !== '') {
            $extra['note'] = trim($note);
        }

        return $this->transitionKnife($knife, $target, $actor, $request, $patches, $extra);
    }

    /** @return array<string, mixed> */
    private function patchesForTarget(KnifeStatus $target, ?Authenticatable $actor): array
    {
        $userId = $actor instanceof User ? $actor->getKey() : null;
        if ($userId === null) {
            return [];
        }

        return match ($target) {
            KnifeStatus::Sharpened => ['sharpened_by_user_id' => $userId],
            KnifeStatus::QualityChecked => ['quality_checked_by_user_id' => $userId],
            KnifeStatus::Returned => ['returned_by_user_id' => $userId],
            default => [],
        };
    }
}
