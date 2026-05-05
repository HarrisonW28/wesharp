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

    /**
     * Tenant Checkout for recurring plans (Stripe mode=subscription). Customers only for public-site plans.
     */
    public function subscribeHosted(User $user, SubscriptionPlan $plan): bool
    {
        if (! $plan->is_active || $plan->trashed()) {
            return false;
        }

        $priceId = trim((string) ($plan->stripe_price_id ?? ''));
        if ($priceId === '') {
            return false;
        }

        if (Permissions::userMay($user, Permissions::SUBSCRIPTIONS_MANAGE)) {
            return true;
        }

        if (Permissions::userMay($user, Permissions::SUBSCRIPTIONS_VIEW)) {
            return (bool) $plan->show_on_public_site;
        }

        return $user->resolvedRole()->isCustomer() && (bool) $plan->show_on_public_site;
    }
}
