<?php

declare(strict_types=1);

namespace App\Actions\Subscriptions;

use App\Models\Company;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\Payments\HostedCheckoutAvailability;
use App\Services\Subscriptions\StripeSubscriptionCheckoutService;

final class CreateStripeSubscriptionCheckoutSessionAction
{
    public function __construct(
        private readonly StripeSubscriptionCheckoutService $checkoutService,
    ) {}

    public function execute(Company $company, SubscriptionPlan $plan, User $user): HostedCheckoutAvailability
    {
        return $this->checkoutService->createCheckoutSession($company, $plan, $user);
    }
}
