<?php

namespace App\Actions\Knives;

use App\Enums\KnifeStatus;
use App\Models\Knife;
use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

final class MarkKnifeSharpenedAction
{
    use MarkKnifeTrait;

    public function execute(Knife $knife, ?Authenticatable $actor, ?Request $request): Knife
    {
        $actorId = $actor instanceof User ? $actor->getKey() : null;

        return $this->transitionKnife(
            $knife,
            KnifeStatus::Sharpened,
            $actor,
            $request,
            $actorId !== null ? ['sharpened_by_user_id' => $actorId] : [],
        );
    }
}
