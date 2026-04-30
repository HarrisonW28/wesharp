<?php

namespace App\Support\Invoices;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Support\Money\MoneyFormatting;
use App\Support\Orders\OrderJson;
use App\Support\Payments\PaymentJson;

final class InvoiceJson
{
    public static function displayReference(Invoice $invoice): string
    {
        if (is_string($invoice->invoice_number) && $invoice->invoice_number !== '') {
            return 'Invoice '.$invoice->invoice_number;
        }

        $d = $invoice->issued_on?->format('j M Y');

        return $d !== null ? 'Invoice · '.$d : 'Your invoice';
    }

    /**
     * Customer account list — no company_id / order_id at root; optional linked order summary.
     *
     * @return array<string, mixed>
     */
    public static function portalListRow(Invoice $invoice): array
    {
        $sub = (int) $invoice->subtotal_pence;
        $tax = (int) $invoice->tax_pence;
        $tot = (int) $invoice->total_pence;

        $received = 0;
        if ($invoice->relationLoaded('payments')) {
            $received = (int) $invoice->payments->sum(fn (Payment $p): int => (int) $p->amount_pence);
        }

        $due = match ($invoice->invoice_status) {
            InvoiceStatus::Void, InvoiceStatus::Paid => 0,
            default => max(0, $tot - $received),
        };

        return [
            'id' => (string) $invoice->id,
            'display_reference' => self::displayReference($invoice),
            'invoice_number' => $invoice->invoice_number,
            'issue_date' => $invoice->issued_on?->format('Y-m-d'),
            'due_date' => $invoice->due_on?->format('Y-m-d'),
            'subtotal_pence' => $sub,
            'tax_pence' => $tax,
            'total_pence' => $tot,
            'subtotal' => $sub,
            'tax_total' => $tax,
            'total' => $tot,
            'formatted_subtotal' => MoneyFormatting::formatGbpFromPence($sub),
            'formatted_tax' => MoneyFormatting::formatGbpFromPence($tax),
            'formatted_total' => MoneyFormatting::formatGbpFromPence($tot),
            'formatted_amount' => MoneyFormatting::formatGbpFromPence($tot),
            'amount_due_pence' => $due,
            'formatted_amount_due' => MoneyFormatting::formatGbpFromPence($due),
            'currency' => $invoice->currency,
            'status' => $invoice->invoice_status?->value,
            'payment_status' => InvoiceRollup::paymentStatus($invoice),
            'overdue' => InvoiceRollup::isPastDue($invoice),
            'company_name' => $invoice->relationLoaded('company') && $invoice->company !== null ? $invoice->company->name : null,
            'order' => $invoice->relationLoaded('order') && $invoice->order !== null ? [
                'id' => (string) $invoice->order_id,
                'display_reference' => OrderJson::displayReference($invoice->order),
                'status' => $invoice->order->order_status?->value,
            ] : null,
            'updated_at' => $invoice->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Customer account detail — line items without UUIDs; payments without internal IDs.
     *
     * @return array<string, mixed>
     */
    public static function portalDetail(Invoice $invoice): array
    {
        $invoice->loadMissing([
            'company:id,name',
            'order:id,created_at,order_status',
            'items' => fn ($q) => $q->orderBy('created_at'),
            'payments' => fn ($q) => $q->orderByDesc('paid_at')->orderByDesc('created_at'),
        ]);

        $row = self::portalListRow($invoice);

        $row['items'] = $invoice->items->map(fn (InvoiceItem $i): array => [
            'description' => $i->description,
            'quantity' => (int) $i->quantity,
            'unit_amount_pence' => (int) $i->unit_amount_pence,
            'line_total_pence' => (int) $i->line_total_pence,
            'formatted_unit_amount' => MoneyFormatting::formatGbpFromPence((int) $i->unit_amount_pence),
            'formatted_line_total' => MoneyFormatting::formatGbpFromPence((int) $i->line_total_pence),
        ])->values()->all();

        $row['payments'] = $invoice->payments
            ->map(fn (Payment $p): array => PaymentJson::portalCustomerSummary($p))
            ->values()
            ->all();

        $row['payment'] = [
            'online_checkout_available' => false,
            'cta_label' => 'Pay online',
            'cta_hint' => 'Online card payment is not set up yet. Use the bank details on your invoice or contact us to pay.',
        ];

        $row['documents'] = [
            'pdf_download_available' => false,
            'print_available' => true,
        ];

        return $row;
    }

    /** @return array<string, mixed> */
    public static function listRow(Invoice $invoice): array
    {
        return [
            'id' => (string) $invoice->id,
            'company_id' => (string) $invoice->company_id,
            'order_id' => (string) $invoice->order_id,
            'invoice_number' => $invoice->invoice_number,
            'issue_date' => $invoice->issued_on?->format('Y-m-d'),
            'due_date' => $invoice->due_on?->format('Y-m-d'),
            'subtotal' => $invoice->subtotal_pence,
            'tax_total' => $invoice->tax_pence,
            'total' => $invoice->total_pence,
            'subtotal_amount_minor' => (int) $invoice->subtotal_pence,
            'tax_amount_minor' => (int) $invoice->tax_pence,
            'total_amount_minor' => (int) $invoice->total_pence,
            'subtotal_formatted' => MoneyFormatting::formatGbpFromPence((int) $invoice->subtotal_pence),
            'tax_total_formatted' => MoneyFormatting::formatGbpFromPence((int) $invoice->tax_pence),
            'formatted_amount' => MoneyFormatting::formatGbpFromPence((int) $invoice->total_pence),
            'currency' => $invoice->currency,
            'status' => $invoice->invoice_status?->value,
            'payment_status' => InvoiceRollup::paymentStatus($invoice),
            'overdue' => InvoiceRollup::isPastDue($invoice),
            'company_name' => $invoice->relationLoaded('company') && $invoice->company !== null ? $invoice->company->name : null,
            'updated_at' => $invoice->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public static function detail(Invoice $invoice): array
    {
        $invoice->loadMissing([
            'company:id,name,city',
            'order:id,booking_id,order_status,total_pence',
            'items:id,invoice_id,description,quantity,unit_amount_pence,line_total_pence',
            'payments',
        ]);

        $row = self::listRow($invoice);

        $row['items'] = $invoice->items->map(fn ($i): array => [
            'id' => (string) $i->id,
            'description' => $i->description,
            'quantity' => $i->quantity,
            'unit_amount' => $i->unit_amount_pence,
            'line_total' => $i->line_total_pence,
            'unit_amount_minor' => (int) $i->unit_amount_pence,
            'line_total_minor' => (int) $i->line_total_pence,
            'unit_formatted' => MoneyFormatting::formatGbpFromPence((int) $i->unit_amount_pence),
            'line_formatted' => MoneyFormatting::formatGbpFromPence((int) $i->line_total_pence),
        ])->values()->all();

        $row['payments'] = $invoice->payments->map(fn ($p): array => PaymentJson::summary($p))->values()->all();

        return $row;
    }
}
