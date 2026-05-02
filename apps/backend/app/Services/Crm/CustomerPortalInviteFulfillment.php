<?php

declare(strict_types=1);

namespace App\Services\Crm;

use App\Enums\CustomerPortalInviteStatus;
use App\Models\CustomerPortalInvite;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use Illuminate\Support\Facades\DB;

/**
 * Links a Clerk-signed-in **customer** user to the company on their pending portal invite (email match).
 * Does not run for staff roles or when {@see User::$company_id} is already set.
 */
final class CustomerPortalInviteFulfillment
{
    public static function tryFulfill(User $user): void
    {
        if (! $user->resolvedRole()->isCustomer()) {
            return;
        }

        if ($user->company_id !== null) {
            return;
        }

        $email = strtolower(trim((string) $user->email));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        $inviteId = null;
        $companyId = null;

        DB::transaction(function () use ($user, $email, &$inviteId, &$companyId): void {
            /** @var CustomerPortalInvite|null $invite */
            $invite = CustomerPortalInvite::query()
                ->where('email', $email)
                ->where('status', CustomerPortalInviteStatus::Pending)
                ->where('expires_at', '>', now())
                ->orderByDesc('last_sent_at')
                ->lockForUpdate()
                ->first();

            if ($invite === null) {
                return;
            }

            $inviteId = (string) $invite->id;
            $companyId = (string) $invite->company_id;

            $user->forceFill(['company_id' => $invite->company_id])->save();

            $invite->forceFill([
                'status' => CustomerPortalInviteStatus::Accepted,
                'accepted_at' => now(),
            ])->save();
        });

        if ($inviteId !== null && $companyId !== null) {
            AuditRecorder::record(null, $user->refresh(), 'customer_portal_invite.accepted_auto', [
                'invite_id' => $inviteId,
                'company_id' => $companyId,
            ], null);
        }
    }
}
