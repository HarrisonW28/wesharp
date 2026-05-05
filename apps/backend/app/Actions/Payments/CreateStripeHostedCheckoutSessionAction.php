<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Contracts\Payments\PaymentProviderInterface;
use App\Models\Invoice;
use App\Services\Payments\HostedCheckoutAvailability;

/**
 * Creates a Stripe Checkout Session for one-off invoices (**mode=payment**). Settlement is webhook-driven.
 */
final class CreateStripeHostedCheckoutSessionAction
{
    public function __construct(
        private readonly PaymentProviderInterface $paymentProvider,
    ) {}

    public function execute(Invoice $invoice, bool $marketingOptIn = false): HostedCheckoutAvailability
    {
        return $this->paymentProvider->createInvoiceHostedCheckoutSession($invoice, $marketingOptIn);
    }
}
