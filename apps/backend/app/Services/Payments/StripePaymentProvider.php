<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Contracts\Payments\PaymentProviderInterface;
use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\Payment;

final class StripePaymentProvider implements PaymentProviderInterface
{
    public function driver(): string
    {
        return 'stripe';
    }

    public function hostedCheckoutAvailability(Invoice $invoice): HostedCheckoutAvailability
    {
        $secret = (string) config('stripe.secret', '');

        if ($secret === '') {
            return new HostedCheckoutAvailability(false, 'Stripe is not configured (STRIPE_SECRET_KEY missing).', null);
        }

        if (str_starts_with($secret, 'sk_live_') && ! (bool) config('stripe.allow_live', false)) {
            return new HostedCheckoutAvailability(
                false,
                'Live Stripe keys are blocked until STRIPE_ALLOW_LIVE=true and webhooks are verified.',
                null,
            );
        }

        if (! str_starts_with($secret, 'sk_test_') && ! str_starts_with($secret, 'sk_live_')) {
            return new HostedCheckoutAvailability(false, 'STRIPE_SECRET_KEY must be a standard sk_test_* or sk_live_* key.', null);
        }

        if (! (bool) config('stripe.hosted_checkout_enabled', false)) {
            return new HostedCheckoutAvailability(
                false,
                'Stripe hosted checkout is disabled (set STRIPE_HOSTED_CHECKOUT_ENABLED=true only when ready to test).',
                null,
            );
        }

        if ((string) config('stripe.webhook_secret', '') === '') {
            return new HostedCheckoutAvailability(
                false,
                'Stripe webhook signing secret is required before offering checkout (STRIPE_WEBHOOK_SECRET).',
                null,
            );
        }

        $st = $invoice->invoice_status;
        if ($st === InvoiceStatus::Void) {
            return new HostedCheckoutAvailability(false, 'Void invoices cannot use checkout.', null);
        }

        if ($st === InvoiceStatus::Draft) {
            return new HostedCheckoutAvailability(false, 'Send the invoice before offering Stripe checkout.', null);
        }

        if ($st === InvoiceStatus::Paid) {
            return new HostedCheckoutAvailability(false, 'Invoice is already paid.', null);
        }

        $invoice->loadMissing('payments');
        $received = (int) $invoice->payments->sum(fn (Payment $p): int => (int) $p->amount_pence);
        /** @phpstan-ignore-next-line */
        $total = (int) $invoice->total_pence;
        if ($total - $received <= 0) {
            return new HostedCheckoutAvailability(false, 'Nothing outstanding on this invoice.', null);
        }

        return new HostedCheckoutAvailability(
            false,
            'Stripe Checkout session creation is not implemented yet (Sprint 7.4 foundation). Use manual payment or wait for API wiring.',
            null,
        );
    }
}
