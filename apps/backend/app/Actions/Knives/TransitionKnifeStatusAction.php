<?php

declare(strict_types=1);

namespace App\Actions\Knives;

use App\Actions\Orders\MaybeAdvanceOrderStatusFromKnivesAction;
use App\Enums\KnifeStatus;
use App\Models\Knife;
use App\Models\Order;
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
        $from = $knife->knife_status ?? KnifeStatus::Logged;
        $patches = $this->patchesForTarget($target, $actor, $from);
        $extra = [];
        if ($note !== null && trim($note) !== '') {
            $extra['note'] = trim($note);
        }

        $fresh = $this->transitionKnife($knife, $target, $actor, $request, $patches, $extra);

        if ($fresh->order_id !== null && $actor !== null && $request !== null) {
            $order = Order::query()->find($fresh->order_id);
            if ($order !== null) {
                app(MaybeAdvanceOrderStatusFromKnivesAction::class)->execute($order, $actor, $request);
            }
        }

        return $fresh;
    }

    /** @return array<string, mixed> */
    private function patchesForTarget(KnifeStatus $target, ?Authenticatable $actor, KnifeStatus $from): array
    {
        $userId = $actor instanceof User ? $actor->getKey() : null;
        if ($userId === null) {
            return [];
        }

        return match ($target) {
            KnifeStatus::Sharpened => ['sharpened_by_user_id' => $userId],
            KnifeStatus::QualityChecked => [
                'quality_checked_by_user_id' => $userId,
                ...($from === KnifeStatus::Sharpening ? ['sharpened_by_user_id' => $userId] : []),
            ],
            KnifeStatus::Returned => ['returned_by_user_id' => $userId],
            default => [],
        };
    }
}
