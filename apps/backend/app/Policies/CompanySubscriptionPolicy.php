<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\CompanySubscription;
use App\Models\User;
use App\Support\Permissions;

final class CompanySubscriptionPolicy
{
    public function viewAny(User $user): bool
    {
        return Permissions::userMay($user, Permissions::SUBSCRIPTIONS_VIEW);
    }

    public function view(User $user, CompanySubscription $subscription): bool
    {
        if (! Permissions::userMay($user, Permissions::SUBSCRIPTIONS_VIEW)) {
            return false;
        }

        return Permissions::userMayForCompany($user, Permissions::COMPANIES_VIEW, $subscription->company_id);
    }

    public function create(User $user): bool
    {
        return Permissions::userMay($user, Permissions::SUBSCRIPTIONS_MANAGE);
    }

    public function update(User $user, CompanySubscription $subscription): bool
    {
        return Permissions::userMay($user, Permissions::SUBSCRIPTIONS_MANAGE);
    }
}
