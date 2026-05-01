<?php

namespace App\Actions\Knives;

use App\Enums\KnifeStatus;
use App\Models\Knife;
use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

final class MarkKnifeQualityCheckedAction
{
    use MarkKnifeTrait;

    public function execute(Knife $knife, ?Authenticatable $actor, ?Request $request): Knife
    {
        $actorId = $actor instanceof User ? $actor->getKey() : null;

        return $this->transitionKnife(
            $knife,
            KnifeStatus::QualityChecked,
            $actor,
            $request,
            $actorId !== null ? ['quality_checked_by_user_id' => $actorId] : [],
        );
    }
}
