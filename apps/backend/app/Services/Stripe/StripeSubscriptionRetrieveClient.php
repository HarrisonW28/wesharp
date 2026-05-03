<?php

declare(strict_types=1);

namespace App\Services\Stripe;

use Stripe\Subscription;

/**
 * Thin wrapper for {@see Subscription::retrieve} (mockable in tests).
 */
class StripeSubscriptionRetrieveClient
{
    public function retrieve(string $stripeSubscriptionId): Subscription
    {
        $key = (string) config('stripe.secret', '');

        return Subscription::retrieve($stripeSubscriptionId, $key !== '' ? ['api_key' => $key] : []);
    }
}
