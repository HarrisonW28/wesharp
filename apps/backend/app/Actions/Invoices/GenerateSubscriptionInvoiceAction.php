<?php

declare(strict_types=1);

namespace App\Actions\Invoices;

use App\Models\CompanySubscription;
use App\Services\Invoices\SubscriptionInvoiceIdempotency;
use Carbon\CarbonInterface;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Placeholder for Sprint 9 automated subscription invoicing.
 *
 * When enabled, this action must:
 * - call {@see SubscriptionInvoiceIdempotency::assertNoDuplicateSubscriptionPeriod}
 * - create draft invoices with {@see \App\Enums\InvoiceSourceType::CompanySubscription}
 * - respect {@see config('invoices.subscription_invoice_generation_enabled')}
 *
 * Full generation, proration, and scheduler wiring are **Sprint 9 / Sprint 11** — see docs.
 */
final class GenerateSubscriptionInvoiceAction
{
    /**
     * @throws HttpException HTTP 501 until product enables generation (Sprint 9).
     */
    public function execute(
        CompanySubscription $subscription,
        CarbonInterface $billingPeriodStart,
        CarbonInterface $billingPeriodEnd,
    ): never {
        if (! config('invoices.subscription_invoice_generation_enabled', false)) {
            throw new HttpException(501, 'Subscription invoice generation is disabled. Enable INVOICE_SUBSCRIPTION_GENERATION_ENABLED when Sprint 9 billing is ready.');
        }

        SubscriptionInvoiceIdempotency::assertNoDuplicateSubscriptionPeriod(
            (string) $subscription->id,
            $billingPeriodStart,
            $billingPeriodEnd,
        );

        throw new HttpException(501, 'Subscription invoice creation logic is not implemented yet (Sprint 9).');
    }
}
