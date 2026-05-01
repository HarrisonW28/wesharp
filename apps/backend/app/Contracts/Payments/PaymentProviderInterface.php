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
     * Whether hosted checkout could be offered for this invoice (config + invoice state).
     * Does not imply a checkout URL exists until the Stripe Checkout API is implemented.
     */
    public function hostedCheckoutAvailability(Invoice $invoice): HostedCheckoutAvailability;
}
