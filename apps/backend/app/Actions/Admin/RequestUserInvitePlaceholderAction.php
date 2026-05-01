<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Models\User;
use App\Services\Audit\AuditRecorder;
use Illuminate\Http\Request;

/**
 * Placeholder until Clerk invite / email resend is wired.
 */
final class RequestUserInvitePlaceholderAction
{
    public function execute(User $actor, User $target, ?Request $request = null): void
    {
        AuditRecorder::record($actor, $target, 'user.invite_resend_placeholder', [
            'note' => 'No invite email sent — integration pending.',
        ], $request);
    }
}
