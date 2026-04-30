<?php

namespace App\Support\Invoices;

use App\Models\Invoice;
use App\Support\Money\MoneyFormatting;
use App\Support\Payments\PaymentJson;

final class InvoiceJson
{
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
