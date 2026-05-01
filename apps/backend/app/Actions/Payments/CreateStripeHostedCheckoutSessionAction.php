<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Contracts\Payments\PaymentProviderInterface;
use App\Models\Invoice;
use App\Services\Payments\HostedCheckoutAvailability;

/**
 * Placeholder for {@see https://stripe.com/docs/api/checkout/sessions/create Stripe Checkout}.
 *
 * Returns availability metadata only — no PaymentIntent / Session is created until explicitly built and audited.
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
