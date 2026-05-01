<?php

namespace App\Actions\Invoices;

use App\Enums\InvoiceLineItemType;
use App\Enums\InvoiceSourceType;
use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Order;
use App\Services\Audit\AuditRecorder;
use App\Support\Money\MoneyFormatting;
use App\Support\Orders\OrderJson;
use Carbon\Carbon;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class CreateInvoiceFromOrderAction
{
    /**
     * @param  non-empty-string  $auditEvent
     *
     * @throws HttpException
     */
    public function execute(
        Order $order,
        ?Authenticatable $actor,
        Request $request,
        ?array $validatedDates = null,
        string $auditEvent = 'invoice.created_from_order',
    ): Invoice {
        /** @phpstan-ignore-next-line */
        return DB::transaction(function () use ($order, $actor, $request, $validatedDates, $auditEvent): Invoice {
            /** @phpstan-ignore-next-line */
            $blocked = Invoice::query()
                ->where('order_id', $order->id)
                ->where('invoice_status', '!=', InvoiceStatus::Void->value)
                ->exists();

            if ($blocked) {
                abort(422, 'A non-void invoice already exists for this order.');
            }

            $order->loadMissing(['items']);

            /** @phpstan-ignore-next-line */
            $number = AllocateInvoiceNumber::generate();

            $issued = isset($validatedDates['issue_date'])
                /** @phpstan-ignore-next-line */
                ? Carbon::parse((string) $validatedDates['issue_date'])->toDateString()
                : now()->toDateString();

            $due = isset($validatedDates['due_date'])
                /** @phpstan-ignore-next-line */
                ? Carbon::parse((string) $validatedDates['due_date'])->toDateString()
                : now()->addDays(30)->toDateString();

            $useSubscriptionLines = $this->shouldUseSubscriptionInvoiceLines($order);

            if ($useSubscriptionLines) {
                /** @var array<string, mixed> $coverage */
                $coverage = $order->subscription_coverage;
                $linePayloads = $this->subscriptionInvoiceLinePayloads($order, $coverage);
                $subtotal = 0;
                foreach ($linePayloads as $row) {
                    $subtotal += (int) $row['line_total_pence'];
                }

                $invoice = Invoice::query()->create([
                    /** @phpstan-ignore-next-line */
                    'company_id' => $order->company_id,
                    /** @phpstan-ignore-next-line */
                    'order_id' => $order->id,
                    'source_type' => InvoiceSourceType::Order->value,
                    /** @phpstan-ignore-next-line */
                    'source_id' => $order->id,
                    'invoice_number' => $number,
                    /** @phpstan-ignore-next-line */
                    'invoice_status' => InvoiceStatus::Draft,
                    /** @phpstan-ignore-next-line */
                    'issued_on' => $issued,
                    /** @phpstan-ignore-next-line */
                    'due_on' => $due,
                    /** @phpstan-ignore-next-line */
                    'subtotal_pence' => $subtotal,
                    'tax_pence' => 0,
                    'total_pence' => $subtotal,
                    /** @phpstan-ignore-next-line */
                    'currency' => $order->currency ?? 'GBP',
                ]);

                foreach ($linePayloads as $row) {
                    InvoiceItem::query()->create([
                        /** @phpstan-ignore-next-line */
                        'invoice_id' => $invoice->id,
                        /** @phpstan-ignore-next-line */
                        'line_item_type' => $row['line_item_type'],
                        /** @phpstan-ignore-next-line */
                        'description' => (string) $row['description'],
                        /** @phpstan-ignore-next-line */
                        'quantity' => (int) $row['quantity'],
                        'unit_amount_pence' => (int) $row['unit_amount_pence'],
                        /** @phpstan-ignore-next-line */
                        'line_total_pence' => (int) $row['line_total_pence'],
                    ]);
                }
            } else {
                $invoice = Invoice::query()->create([
                    /** @phpstan-ignore-next-line */
                    'company_id' => $order->company_id,
                    /** @phpstan-ignore-next-line */
                    'order_id' => $order->id,
                    'source_type' => InvoiceSourceType::Order->value,
                    /** @phpstan-ignore-next-line */
                    'source_id' => $order->id,
                    'invoice_number' => $number,
                    /** @phpstan-ignore-next-line */
                    'invoice_status' => InvoiceStatus::Draft,
                    /** @phpstan-ignore-next-line */
                    'issued_on' => $issued,
                    /** @phpstan-ignore-next-line */
                    'due_on' => $due,
                    /** @phpstan-ignore-next-line */
                    'subtotal_pence' => (int) $order->subtotal_pence,
                    /** @phpstan-ignore-next-line */
                    'tax_pence' => (int) $order->tax_pence,
                    /** @phpstan-ignore-next-line */
                    'total_pence' => (int) $order->total_pence,
                    /** @phpstan-ignore-next-line */
                    'currency' => $order->currency ?? 'GBP',
                ]);

                foreach ($order->items()->orderBy('created_at')->get() as $line) {
                    /** @phpstan-ignore-next-line */
                    $qty = max(1, (int) $line->quantity);
                    /** @phpstan-ignore-next-line */
                    $unit = max(0, (int) $line->unit_amount_pence);

                    InvoiceItem::query()->create([
                        /** @phpstan-ignore-next-line */
                        'invoice_id' => $invoice->id,
                        'line_item_type' => InvoiceLineItemType::OneOffService,
                        /** @phpstan-ignore-next-line */
                        'description' => (string) $line->description,
                        /** @phpstan-ignore-next-line */
                        'quantity' => $qty,
                        'unit_amount_pence' => $unit,
                        /** @phpstan-ignore-next-line */
                        'line_total_pence' => $unit * $qty,
                    ]);
                }

                if ($invoice->items()->doesntExist()) {
                    /** @phpstan-ignore-next-line */
                    $stp = max(1, (int) $order->subtotal_pence);

                    InvoiceItem::query()->create([
                        /** @phpstan-ignore-next-line */
                        'invoice_id' => $invoice->id,
                        'line_item_type' => InvoiceLineItemType::OneOffService,
                        /** @phpstan-ignore-next-line */
                        'description' => 'Workshop services — order '.(string) $order->id,
                        'quantity' => 1,
                        'unit_amount_pence' => $stp,
                        /** @phpstan-ignore-next-line */
                        'line_total_pence' => $stp,
                    ]);
                }
            }

            AuditRecorder::record($actor, $invoice, $auditEvent, [
                /** @phpstan-ignore-next-line */
                'order_id' => (string) $order->id,
                'invoice_number' => $invoice->invoice_number,
                'subscription_invoice' => $useSubscriptionLines,
            ], $request);

            /** @phpstan-ignore-next-line */
            return $invoice->fresh([
                /** @phpstan-ignore-next-line */
                'company:id,name,city',
                'order:id,booking_id',
                'items',
                'payments',
            ]);
        });
    }

    private function shouldUseSubscriptionInvoiceLines(Order $order): bool
    {
        $coverage = $order->subscription_coverage;

        return is_array($coverage)
            && ($coverage['mode'] ?? '') === 'subscription'
            && $order->company_subscription_id !== null;
    }

    /**
     * @param  array<string, mixed>  $coverage
     * @return list<array{description: string, quantity: int, unit_amount_pence: int, line_total_pence: int, line_item_type: InvoiceLineItemType}>
     */
    private function subscriptionInvoiceLinePayloads(Order $order, array $coverage): array
    {
        $ref = OrderJson::reference($order);
        $lines = [];

        $collIn = (int) ($coverage['collections_included_for_order'] ?? 0);
        $knIn = (int) ($coverage['knives_included_for_order'] ?? 0);
        if ($collIn + $knIn > 0) {
            $summary = (string) ($coverage['included_summary'] ?? 'Plan allowance');
            $lines[] = [
                'description' => 'Included in subscription — '.$summary.' ('.$ref.')',
                'quantity' => 1,
                'unit_amount_pence' => 0,
                'line_total_pence' => 0,
                'line_item_type' => InvoiceLineItemType::Subscription,
            ];
        }

        $rate = (int) ($coverage['overage_unit_price_pence'] ?? 0);
        $collOv = (int) ($coverage['collections_overage_for_order'] ?? 0);
        $knOv = (int) ($coverage['knives_overage_for_order'] ?? 0);

        if ($collOv > 0) {
            $unit = max(0, $rate);
            $lines[] = [
                'description' => 'Subscription overage — collection visit(s) × '.$collOv.' @ '.MoneyFormatting::formatGbpFromPence($unit).' each ('.$ref.')',
                'quantity' => $collOv,
                'unit_amount_pence' => $unit,
                'line_total_pence' => $unit * $collOv,
                'line_item_type' => InvoiceLineItemType::Overage,
            ];
        }

        if ($knOv > 0) {
            $unit = max(0, $rate);
            $lines[] = [
                'description' => 'Subscription overage — knife / service units × '.$knOv.' @ '.MoneyFormatting::formatGbpFromPence($unit).' each ('.$ref.')',
                'quantity' => $knOv,
                'unit_amount_pence' => $unit,
                'line_total_pence' => $unit * $knOv,
                'line_item_type' => InvoiceLineItemType::Overage,
            ];
        }

        if ($lines === []) {
            $lines[] = [
                'description' => 'Subscription — no charge recorded for this order ('.$ref.')',
                'quantity' => 1,
                'unit_amount_pence' => 0,
                'line_total_pence' => 0,
                'line_item_type' => InvoiceLineItemType::Subscription,
            ];
        }

        return $lines;
    }
}
