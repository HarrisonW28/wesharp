<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Enums\CustomerPortalInviteStatus;
use App\Models\CustomerPortalInvite;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

final class ResendCustomerPortalInviteAction
{
    public function __construct(
        private readonly SendCustomerPortalInviteAction $send,
    ) {}

    public function execute(CustomerPortalInvite $invite, User $actor, ?Request $request): CustomerPortalInvite
    {
        if ($invite->status === CustomerPortalInviteStatus::Accepted) {
            throw ValidationException::withMessages([
                'invite' => 'This invite was already accepted.',
            ]);
        }

        $company = $invite->company;
        [$fresh] = $this->send->execute($company, $invite->email, $actor, $request, true);

        return $fresh;
    }
}
