<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Support\Permissions;

final class SubscriptionPlanPolicy
{
    public function viewAny(User $user): bool
    {
        return Permissions::userMay($user, Permissions::SUBSCRIPTIONS_VIEW);
    }

    public function view(User $user, SubscriptionPlan $plan): bool
    {
        return Permissions::userMay($user, Permissions::SUBSCRIPTIONS_VIEW);
    }

    public function create(User $user): bool
    {
        return Permissions::userMay($user, Permissions::SUBSCRIPTIONS_MANAGE);
    }

    public function update(User $user, SubscriptionPlan $plan): bool
    {
        return Permissions::userMay($user, Permissions::SUBSCRIPTIONS_MANAGE);
    }

    public function delete(User $user, SubscriptionPlan $plan): bool
    {
        return Permissions::userMay($user, Permissions::SUBSCRIPTIONS_MANAGE);
    }
}
