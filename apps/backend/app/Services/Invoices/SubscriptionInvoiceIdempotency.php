<?php

declare(strict_types=1);

namespace App\Services\Invoices;

use App\Enums\InvoiceSourceType;
use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use Carbon\CarbonInterface;

/**
 * Application-level duplicate guard for subscription billing (belt alongside DB partial unique index).
 *
 * Idempotency rule: at most one **non-void** invoice per
 * (`company_subscription` source, subscription id, billing period inclusive dates).
 *
 * @see docs/product/subscription-invoices.md
 */
final class SubscriptionInvoiceIdempotency
{
    public static function blockingInvoiceExists(
        string $subscriptionId,
        CarbonInterface|string $billingPeriodStart,
        CarbonInterface|string $billingPeriodEnd,
        ?string $exceptInvoiceId = null,
    ): bool {
        $start = $billingPeriodStart instanceof CarbonInterface ? $billingPeriodStart->toDateString() : (string) $billingPeriodStart;
        $end = $billingPeriodEnd instanceof CarbonInterface ? $billingPeriodEnd->toDateString() : (string) $billingPeriodEnd;

        $q = Invoice::query()
            ->where('source_type', InvoiceSourceType::CompanySubscription->value)
            ->where('source_id', $subscriptionId)
            ->whereDate('billing_period_start', $start)
            ->whereDate('billing_period_end', $end)
            ->where('invoice_status', '!=', InvoiceStatus::Void->value);

        if ($exceptInvoiceId !== null && $exceptInvoiceId !== '') {
            $q->where('id', '!=', $exceptInvoiceId);
        }

        return $q->exists();
    }

    /**
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     */
    public static function assertNoDuplicateSubscriptionPeriod(
        string $subscriptionId,
        CarbonInterface|string $billingPeriodStart,
        CarbonInterface|string $billingPeriodEnd,
        ?string $exceptInvoiceId = null,
    ): void {
        if (self::blockingInvoiceExists($subscriptionId, $billingPeriodStart, $billingPeriodEnd, $exceptInvoiceId)) {
            abort(422, 'A non-void invoice already exists for this subscription billing period.');
        }
    }
}
