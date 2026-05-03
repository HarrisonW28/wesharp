<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Contracts\Payments\PaymentProviderInterface;
use App\Models\Invoice;
use App\Services\Payments\HostedCheckoutAvailability;

/**
 * Placeholder for {@see https://stripe.com/docs/api/checkout/sessions/create Stripe Checkout}.
 * One-off invoices use **mode=payment** (invoice-first). Subscription programmes use **mode=subscription** separately — do not make Stripe subscription-only.
 *
 * Returns availability metadata only — no session is created until Sprint 19.2+ wiring and webhooks are verified.
 */
final class CreateStripeHostedCheckoutSessionAction
{
    public function __construct(
        private readonly PaymentProviderInterface $paymentProvider,
    ) {}

    public function execute(Invoice $invoice): HostedCheckoutAvailability
    {
        return $this->paymentProvider->hostedCheckoutAvailability($invoice);
    }
}
