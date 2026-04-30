<?php

namespace App\Actions\Knives;

use App\Enums\KnifeStatus;
use App\Models\Knife;
use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

final class MarkKnifeReturnedAction
{
    use MarkKnifeTrait;

    public function execute(Knife $knife, ?Authenticatable $actor, ?Request $request): Knife
    {
        $actorId = $actor instanceof User ? $actor->getKey() : null;

        return $this->transitionKnife(
            $knife,
            KnifeStatus::Returned,
            'knife.mark_returned',
            $actor,
            $request,
            $actorId !== null ? ['returned_by_user_id' => $actorId] : [],
        );
    }
}
