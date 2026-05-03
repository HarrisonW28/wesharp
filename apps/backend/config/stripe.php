<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Stripe (PSP foundation — no secrets committed; use .env only)
    |--------------------------------------------------------------------------
    |
    | See docs/integrations/stripe.md for webhook setup and go-live checklist.
    |
    */

    'secret' => env('STRIPE_SECRET_KEY'),

    'public' => env('STRIPE_PUBLIC_KEY'),

    'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),

    /*
    | Hosted Checkout / Payment Links API — stays off until explicitly enabled.
    | Even when true, session creation remains a guarded placeholder until wired.
    */
    'hosted_checkout_enabled' => filter_var(env('STRIPE_HOSTED_CHECKOUT_ENABLED', false), FILTER_VALIDATE_BOOL),

    /*
    | Block live secret keys (sk_live_*) unless this is true. Prevents accidental
    | production charges before webhooks and reconciliation are verified.
    */
    'allow_live' => filter_var(env('STRIPE_ALLOW_LIVE', false), FILTER_VALIDATE_BOOL),

    /*
    | Redirect URLs for Stripe Checkout (mode=payment for invoices; see Sprint 19).
    | Required only when hosted checkout is enabled — used when creating Checkout Sessions.
    */
    'checkout_success_url' => env('STRIPE_CHECKOUT_SUCCESS_URL'),

    'checkout_cancel_url' => env('STRIPE_CHECKOUT_CANCEL_URL'),

];
