<?php

namespace App\Actions\Knives;

use App\Enums\KnifeStatus;
use App\Models\Knife;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

final class MarkKnifeInspectedAction
{
    use MarkKnifeTrait;

    public function execute(Knife $knife, ?Authenticatable $actor, ?Request $request): Knife
    {
        return $this->transitionKnife($knife, KnifeStatus::Inspected, 'knife.mark_inspected', $actor, $request);
    }
}
