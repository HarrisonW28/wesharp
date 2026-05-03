<?php

declare(strict_types=1);

namespace App\Services\Payments;

use Stripe\Checkout\Session;

/**
 * Thin wrapper for {@see Session::create} to keep Stripe SDK calls mockable in tests.
 */
class StripeCheckoutSessionClient
{
    /**
     * @param  array<string, mixed>  $params
     * @param  array<string, mixed>  $options
     */
    public function createCheckoutSession(array $params, array $options = []): Session
    {
        $key = (string) config('stripe.secret', '');
        if ($key !== '' && ! isset($options['api_key'])) {
            $options['api_key'] = $key;
        }

        return Session::create($params, $options);
    }
}
