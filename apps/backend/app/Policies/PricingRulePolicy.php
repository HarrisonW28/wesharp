<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\PricingRule;
use App\Models\User;
use App\Support\Permissions;

final class PricingRulePolicy
{
    public function viewAny(User $user): bool
    {
        return Permissions::userMay($user, Permissions::PRICING_VIEW);
    }

    public function view(User $user, PricingRule $rule): bool
    {
        return Permissions::userMay($user, Permissions::PRICING_VIEW);
    }

    public function create(User $user): bool
    {
        return Permissions::userMay($user, Permissions::PRICING_MANAGE);
    }

    public function update(User $user, PricingRule $rule): bool
    {
        return Permissions::userMay($user, Permissions::PRICING_MANAGE);
    }
}
