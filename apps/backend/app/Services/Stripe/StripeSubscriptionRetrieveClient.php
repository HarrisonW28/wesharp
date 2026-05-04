<?php

declare(strict_types=1);

namespace App\Services\Stripe;

use App\Support\Stripe\ResolvedStripeConfig;
use Stripe\Subscription;

/**
 * Thin wrapper for {@see Subscription::retrieve} (mockable in tests).
 */
class StripeSubscriptionRetrieveClient
{
    public function __construct(
        private readonly ResolvedStripeConfig $stripe,
    ) {}

    public function retrieve(string $stripeSubscriptionId): Subscription
    {
        $key = $this->stripe->secretKey();

        return Subscription::retrieve($stripeSubscriptionId, $key !== '' ? ['api_key' => $key] : []);
    }
}
