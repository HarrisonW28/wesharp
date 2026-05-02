<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Enums\CustomerPortalInviteStatus;
use App\Models\Company;
use App\Models\CustomerPortalInvite;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use App\Services\Clerk\ClerkInvitationsClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

final class SendCustomerPortalInviteAction
{
    public function __construct(
        private readonly ClerkInvitationsClient $clerkInvitations,
    ) {}

    /**
     * @return array{0: CustomerPortalInvite, 1: bool} Invite and whether this was a newly created row (before this send).
     */
    public function execute(Company $company, string $email, User $actor, ?Request $request, bool $isResend): array
    {
        $normalized = strtolower(trim($email));
        Validator::make(['email' => $normalized], ['email' => ['required', 'email', 'max:191']])->validate();

        $existingUser = User::query()->where('email', $normalized)->first();
        if ($existingUser !== null) {
            if ($existingUser->resolvedRole()->isInternal()) {
                throw ValidationException::withMessages([
                    'email' => 'This email belongs to a staff account.',
                ]);
            }

            if ($existingUser->company_id !== null && (string) $existingUser->company_id !== (string) $company->id) {
                throw ValidationException::withMessages([
                    'email' => 'This user is already linked to another organisation.',
                ]);
            }

            if ($existingUser->company_id !== null && (string) $existingUser->company_id === (string) $company->id) {
                throw ValidationException::withMessages([
                    'email' => 'This user is already on this account.',
                ]);
            }
        }

        $otherPending = CustomerPortalInvite::query()
            ->where('email', $normalized)
            ->where('company_id', '!=', $company->id)
            ->where('status', CustomerPortalInviteStatus::Pending)
            ->where('expires_at', '>', now())
            ->exists();

        if ($otherPending) {
            throw ValidationException::withMessages([
                'email' => 'This email already has a pending portal invite from another account.',
            ]);
        }

        $invite = CustomerPortalInvite::query()->firstOrNew([
            'company_id' => $company->id,
            'email' => $normalized,
        ]);

        $wasFresh = ! $invite->exists;

        if ($invite->exists && $invite->status === CustomerPortalInviteStatus::Accepted) {
            throw ValidationException::withMessages([
                'email' => 'This invite was already accepted.',
            ]);
        }

        $plainToken = bin2hex(random_bytes(32));

        $invite->fill([
            'status' => CustomerPortalInviteStatus::Pending,
            'token_hash' => hash('sha256', $plainToken),
            'invited_by_user_id' => $actor->getKey(),
            'expires_at' => now()->addDays(14),
            'last_sent_at' => now(),
            'accepted_at' => null,
            'clerk_invitation_id' => null,
            'last_clerk_error' => null,
        ]);
        $invite->save();

        $clerk = $this->clerkInvitations->create($normalized);
        if (! $clerk->delivered) {
            $invite->forceFill([
                'last_clerk_error' => $clerk->errorMessage ?? ($clerk->skipped ? 'skipped' : 'unknown'),
            ])->save();
        } else {
            $invite->forceFill([
                'clerk_invitation_id' => $clerk->invitationId,
                'last_clerk_error' => null,
            ])->save();
        }

        $invite = $invite->fresh();
        \assert($invite instanceof CustomerPortalInvite);

        AuditRecorder::record($actor, $company, $isResend ? 'customer_portal_invite.resent' : 'customer_portal_invite.sent', [
            'invite_id' => (string) $invite->id,
            'email' => $normalized,
            'clerk_invitation_id' => $invite->clerk_invitation_id,
            'clerk_delivered' => $clerk->delivered,
            'clerk_skipped' => $clerk->skipped,
        ], $request);

        return [$invite, $wasFresh];
    }
}
