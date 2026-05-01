<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Enums\UserStatus;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use Illuminate\Http\Request;

final class ActivateDirectoryUserAction
{
    public function execute(User $actor, User $target, ?Request $request = null): User
    {
        $before = ['status' => $target->status?->value];
        /** @phpstan-ignore-next-line */
        $target->status = UserStatus::Active;
        $target->save();

        AuditRecorder::record($actor, $target, 'user.activated', ['before' => $before], $request);

        return $target;
    }
}
