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
     * One-off AR: Checkout **mode=payment** from an issued invoice. Does not imply a checkout URL exists until implemented.
     */
    public function hostedCheckoutAvailability(Invoice $invoice): HostedCheckoutAvailability;
}
