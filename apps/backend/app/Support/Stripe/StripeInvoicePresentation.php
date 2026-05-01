<?php

declare(strict_types=1);

namespace App\Support\Stripe;

use App\Models\Invoice;
use App\Services\Payments\StripePaymentProvider;

/**
 * Admin / portal JSON helpers — no secrets exposed.
 */
final class StripeInvoicePresentation
{
    public static function isPublishableKeyConfigured(): bool
    {
        $k = (string) config('stripe.public', '');

        return $k !== '' && (str_starts_with($k, 'pk_test_') || str_starts_with($k, 'pk_live_'));
    }

    public static function isWebhookSecretConfigured(): bool
    {
        return (string) config('stripe.webhook_secret', '') !== '';
    }

    public static function isLiveModeBlockedByPolicy(): bool
    {
        $secret = (string) config('stripe.secret', '');

        return str_starts_with($secret, 'sk_live_') && ! (bool) config('stripe.allow_live', false);
    }

    /**
     * @return array<string, mixed>
     */
    public static function adminDetailPanel(Invoice $invoice): array
    {
        $provider = app(StripePaymentProvider::class);
        $r = $provider->hostedCheckoutAvailability($invoice);

        return [
            'driver' => $provider->driver(),
            'hosted_checkout_available' => $r->available,
            'hosted_checkout_disabled_reason' => $r->disabledReason,
            'checkout_url' => $r->checkoutUrl,
            'publishable_key_configured' => self::isPublishableKeyConfigured(),
            'webhook_secret_configured' => self::isWebhookSecretConfigured(),
            'live_mode_blocked' => self::isLiveModeBlockedByPolicy(),
        ];
    }

    /**
     * Customer portal CTA — never claims checkout works until a URL is returned.
     *
     * @return array{online_checkout_available: bool, cta_label: string, cta_hint: string}
     */
    public static function portalPaymentCta(Invoice $invoice): array
    {
        $provider = app(StripePaymentProvider::class);
        $r = $provider->hostedCheckoutAvailability($invoice);
        $hasUrl = $r->available && is_string($r->checkoutUrl) && $r->checkoutUrl !== '';

        return [
            'online_checkout_available' => $hasUrl,
            'cta_label' => 'Pay online',
            'cta_hint' => $hasUrl
                ? 'Pay securely online.'
                : self::portalHintForCustomers($r->disabledReason),
        ];
    }

    private static function portalHintForCustomers(?string $reason): string
    {
        if ($reason === null) {
            return 'Online card payment is not available yet. Use the payment details on your invoice or contact us.';
        }

        if (
            str_contains($reason, 'STRIPE_')
            || str_contains($reason, 'not implemented')
            || str_contains($reason, 'webhook signing secret')
        ) {
            return 'Online card payment is not available yet. Use the payment details on your invoice or contact us.';
        }

        return $reason;
    }
}
