<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Offer subscription checkout in the public booking flow
    |--------------------------------------------------------------------------
    |
    | When true, the booking wizard surfaces guidance about completing Stripe
    | subscription checkout after creating an account (hosted checkout requires a signed-in user today).
    |
    */
    'offer_subscription_checkout_in_wizard' => filter_var(
        env('PUBLIC_BOOKING_OFFER_SUBSCRIPTION_CHECKOUT_IN_WIZARD', false),
        FILTER_VALIDATE_BOOL,
    ),
];
