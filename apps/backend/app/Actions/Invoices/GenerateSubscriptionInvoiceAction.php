<?php

declare(strict_types=1);

namespace App\Actions\Invoices;

use App\Enums\InvoiceLineItemType;
use App\Enums\InvoiceSourceType;
use App\Enums\InvoiceStatus;
use App\Models\CompanySubscription;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Services\Invoices\SubscriptionInvoiceIdempotency;
use App\Services\Subscriptions\OrderSubscriptionCoverageService;
use Carbon\CarbonInterface;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Manual subscription invoice generation (draft only).
 *
 * Idempotency rule: at most one non-void invoice per subscription + billing period.
 */
final class GenerateSubscriptionInvoiceAction
{
    /**
     * @return array{invoice: Invoice, already_existed: bool}
     *
     * @throws HttpException
     */
    public function execute(
        CompanySubscription $subscription,
        CarbonInterface $billingPeriodStart,
        CarbonInterface $billingPeriodEnd,
    ): array {
        if (! config('invoices.subscription_invoice_generation_enabled', false)) {
            throw new HttpException(501, 'Subscription invoice generation is disabled. Enable INVOICE_SUBSCRIPTION_GENERATION_ENABLED when Sprint 9 billing is ready.');
        }

        $subscription->loadMissing(['company', 'plan']);

        $start = $billingPeriodStart->toDateString();
        $end = $billingPeriodEnd->toDateString();

        /** @phpstan-ignore-next-line */
        $existing = Invoice::query()
            ->where('source_type', InvoiceSourceType::CompanySubscription->value)
            ->where('source_id', (string) $subscription->id)
            ->whereDate('billing_period_start', $start)
            ->whereDate('billing_period_end', $end)
            ->where('invoice_status', '!=', InvoiceStatus::Void->value)
            ->first();

        if ($existing instanceof Invoice) {
            /** @phpstan-ignore-next-line */
            return [
                'invoice' => $existing->fresh(['company:id,name,city', 'items', 'payments']),
                'already_existed' => true,
            ];
        }

        SubscriptionInvoiceIdempotency::assertNoDuplicateSubscriptionPeriod((string) $subscription->id, $start, $end);

        $svc = app(OrderSubscriptionCoverageService::class);
        $usage = $svc->usageSummaryForSubscription($subscription);

        $planName = $subscription->plan?->name ?? $subscription->planName();
        $baseAmount = (int) $subscription->price_amount_minor_snapshot;
        $currency = (string) ($subscription->currency ?? 'GBP');

        $overColl = (int) ($usage['collections_overage_units'] ?? 0);
        $overKn = (int) ($usage['knives_overage_units'] ?? 0);
        $rate = $subscription->plan?->overage_price_amount_minor !== null
            ? (int) $subscription->plan->overage_price_amount_minor
            : 0;

        $lines = [];
        $lines[] = [
            'line_item_type' => InvoiceLineItemType::Subscription,
            'description' => 'Subscription — '.$planName.' ('.$start.' to '.$end.')',
            'quantity' => 1,
            'unit_amount_pence' => max(0, $baseAmount),
        ];

        if ($overColl > 0) {
            $unit = max(0, $rate);
            $lines[] = [
                'line_item_type' => InvoiceLineItemType::Overage,
                'description' => 'Subscription overage — collection visits ('.$start.' to '.$end.')',
                'quantity' => $overColl,
                'unit_amount_pence' => $unit,
            ];
        }

        if ($overKn > 0) {
            $unit = max(0, $rate);
            $lines[] = [
                'line_item_type' => InvoiceLineItemType::Overage,
                'description' => 'Subscription overage — knife / service units ('.$start.' to '.$end.')',
                'quantity' => $overKn,
                'unit_amount_pence' => $unit,
            ];
        }

        $subtotal = 0;
        foreach ($lines as $l) {
            $subtotal += ((int) $l['quantity']) * ((int) $l['unit_amount_pence']);
        }

        try {
            /** @phpstan-ignore-next-line */
            $invoice = DB::transaction(function () use ($subscription, $start, $end, $currency, $subtotal, $lines): Invoice {
                $issued = now()->toDateString();
                $due = now()->addDays(14)->toDateString();

                $invoice = Invoice::query()->create([
                    'company_id' => $subscription->company_id,
                    'order_id' => null,
                    'invoice_number' => AllocateInvoiceNumber::generate(),
                    'invoice_status' => InvoiceStatus::Draft->value,
                    'issued_on' => $issued,
                    'due_on' => $due,
                    'subtotal_pence' => $subtotal,
                    'tax_pence' => 0,
                    'total_pence' => $subtotal,
                    'currency' => $currency !== '' ? $currency : 'GBP',
                    'is_subscription_billing' => true,
                    'source_type' => InvoiceSourceType::CompanySubscription->value,
                    'source_id' => (string) $subscription->id,
                    'billing_period_start' => $start,
                    'billing_period_end' => $end,
                ]);

                foreach ($lines as $l) {
                    $qty = max(1, (int) $l['quantity']);
                    $unit = max(0, (int) $l['unit_amount_pence']);

                    InvoiceItem::query()->create([
                        'invoice_id' => $invoice->id,
                        'line_item_type' => $l['line_item_type'],
                        'description' => (string) $l['description'],
                        'quantity' => $qty,
                        'unit_amount_pence' => $unit,
                        'line_total_pence' => $qty * $unit,
                    ]);
                }

                return $invoice->fresh(['items', 'payments']);
            });
        } catch (QueryException $e) {
            // DB partial unique index is the final guard; translate to HTTP 422 for safe retries.
            if (str_contains($e->getMessage(), 'invoices_company_subscription_bill_unique')) {
                abort(422, 'A non-void invoice already exists for this subscription billing period.');
            }
            throw $e;
        }

        /** @phpstan-ignore-next-line */
        return [
            'invoice' => $invoice->fresh(['company:id,name,city', 'items', 'payments']),
            'already_existed' => false,
        ];
    }
}
