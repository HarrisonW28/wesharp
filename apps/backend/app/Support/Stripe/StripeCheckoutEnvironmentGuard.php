<?php

declare(strict_types=1);

namespace App\Support\Stripe;

/**
 * Shared gates for offering Stripe Checkout (payment or subscription).
 */
final class StripeCheckoutEnvironmentGuard
{
    public static function blockingReason(): ?string
    {
        $cfg = app(ResolvedStripeConfig::class);
        $secret = $cfg->secretKey();

        if ($secret === '') {
            return 'Stripe is not configured (STRIPE_SECRET_KEY missing).';
        }

        if (str_starts_with($secret, 'sk_live_') && ! $cfg->allowLive()) {
            return 'Live Stripe keys are blocked until STRIPE_ALLOW_LIVE=true and webhooks are verified.';
        }

        if (! str_starts_with($secret, 'sk_test_') && ! str_starts_with($secret, 'sk_live_')) {
            return 'STRIPE_SECRET_KEY must be a standard sk_test_* or sk_live_* key.';
        }

        if (! $cfg->hostedCheckoutEnabled()) {
            return 'Stripe hosted checkout is disabled (set STRIPE_HOSTED_CHECKOUT_ENABLED=true only when ready to test).';
        }

        if ($cfg->webhookSecret() === '') {
            return 'Stripe webhook signing secret is required before offering checkout (STRIPE_WEBHOOK_SECRET).';
        }

        $successUrl = $cfg->checkoutSuccessUrl();
        $cancelUrl = $cfg->checkoutCancelUrl();
        if ($successUrl === '' || $cancelUrl === '') {
            return 'Stripe checkout redirect URLs are required when STRIPE_HOSTED_CHECKOUT_ENABLED=true (STRIPE_CHECKOUT_SUCCESS_URL and STRIPE_CHECKOUT_CANCEL_URL).';
        }

        return null;
    }
}
