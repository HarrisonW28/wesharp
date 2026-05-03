<?php

declare(strict_types=1);

namespace App\Contracts\Payments;

use App\Models\Invoice;
use App\Services\Payments\HostedCheckoutAvailability;

/**
 * Abstraction for payment service providers (Stripe today; others later).
 *
 * Never mark invoices paid from the frontend — only server actions and verified webhooks.
 */
interface PaymentProviderInterface
{
    public function driver(): string;

    /**
     * Preview for UI: whether Checkout could be offered (config + invoice state). Never includes a session URL.
     */
    public function invoiceHostedCheckoutPreview(Invoice $invoice): HostedCheckoutAvailability;

    /**
     * Create a Stripe Checkout Session for the invoice outstanding balance (**mode=payment**).
     */
    public function createInvoiceHostedCheckoutSession(Invoice $invoice): HostedCheckoutAvailability;
}
