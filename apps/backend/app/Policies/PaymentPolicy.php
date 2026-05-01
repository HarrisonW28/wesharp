<?php

namespace App\Policies;

use App\Models\Payment;
use App\Models\User;
use App\Support\Permissions;

final class PaymentPolicy
{
    public function viewAny(User $user): bool
    {
        return Permissions::userMay($user, Permissions::PAYMENTS_VIEW);
    }

    public function view(User $user, Payment $payment): bool
    {
        return Permissions::userMayForCompany($user, Permissions::PAYMENTS_VIEW, (string) $payment->company_id);
    }

    /** Adjust staff-entered reference/notes only — never amount or method here. */
    public function update(User $user, Payment $payment): bool
    {
        return Permissions::userMay($user, Permissions::PAYMENTS_MANAGE)
            && Permissions::userMayForCompany($user, Permissions::PAYMENTS_VIEW, (string) $payment->company_id);
    }
}
