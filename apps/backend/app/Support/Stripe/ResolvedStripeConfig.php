<?php

declare(strict_types=1);

namespace App\Support\Stripe;

use App\Models\StripeSetting;

/**
 * Effective Stripe configuration: encrypted DB overrides win over {@see config('stripe.*')} (env).
 */
final class ResolvedStripeConfig
{
    public function __construct(
        private readonly StripeSetting $setting,
    ) {}

    public function secretKey(): string
    {
        $v = $this->setting->secret_key;

        if (is_string($v) && $v !== '') {
            return $v;
        }

        return (string) config('stripe.secret', '');
    }

    public function publicKey(): string
    {
        $v = $this->setting->public_key;

        if (is_string($v) && $v !== '') {
            return $v;
        }

        return (string) config('stripe.public', '');
    }

    public function webhookSecret(): string
    {
        $v = $this->setting->webhook_secret;

        if (is_string($v) && $v !== '') {
            return $v;
        }

        return (string) config('stripe.webhook_secret', '');
    }

    public function hostedCheckoutEnabled(): bool
    {
        $row = $this->setting->hosted_checkout_enabled;
        if ($row !== null) {
            return $row;
        }

        return (bool) config('stripe.hosted_checkout_enabled', false);
    }

    public function allowLive(): bool
    {
        $row = $this->setting->allow_live;
        if ($row !== null) {
            return $row;
        }

        return (bool) config('stripe.allow_live', false);
    }

    public function checkoutSuccessUrl(): string
    {
        $v = $this->setting->checkout_success_url;
        if (is_string($v) && trim($v) !== '') {
            return trim($v);
        }

        return trim((string) config('stripe.checkout_success_url', ''));
    }

    public function checkoutCancelUrl(): string
    {
        $v = $this->setting->checkout_cancel_url;
        if (is_string($v) && trim($v) !== '') {
            return trim($v);
        }

        return trim((string) config('stripe.checkout_cancel_url', ''));
    }

    public function row(): StripeSetting
    {
        return $this->setting;
    }
}
