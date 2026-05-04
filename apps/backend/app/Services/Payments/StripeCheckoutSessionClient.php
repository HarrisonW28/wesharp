<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Support\Stripe\ResolvedStripeConfig;
use Stripe\Checkout\Session;

/**
 * Thin wrapper for {@see Session::create} to keep Stripe SDK calls mockable in tests.
 */
class StripeCheckoutSessionClient
{
    public function __construct(
        private readonly ResolvedStripeConfig $stripe,
    ) {}

    /**
     * @param  array<string, mixed>  $params
     * @param  array<string, mixed>  $options
     */
    public function createCheckoutSession(array $params, array $options = []): Session
    {
        $key = $this->stripe->secretKey();
        if ($key !== '' && ! isset($options['api_key'])) {
            $options['api_key'] = $key;
        }

        return Session::create($params, $options);
    }
}
