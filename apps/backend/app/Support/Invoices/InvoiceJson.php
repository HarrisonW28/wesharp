<?php

declare(strict_types=1);

namespace App\Support\Invoices;

use App\Enums\InvoiceStatus;
use App\Http\Resources\BookingResource;
use App\Models\AuditLog;
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

    /** Human-facing invoice number for admin (falls back to INV- prefix). */
    public static function adminReference(Invoice $invoice): string
    {
        if (is_string($invoice->invoice_number) && $invoice->invoice_number !== '') {
            return $invoice->invoice_number;
        }

        $hex = str_replace('-', '', (string) $invoice->id);

        return 'INV-'.strtoupper(substr($hex, 0, 8));
    }

    /** @return 'service'|'subscription'|'overage'|'adjustment' */
    public static function inferLineKind(InvoiceItem $item): string
    {
        $d = strtolower($item->description);

        if (str_contains($d, 'subscription')) {
            return 'subscription';
        }

        if (str_contains($d, 'overage')) {
            return 'overage';
        }

        if (str_contains($d, 'adjust')) {
            return 'adjustment';
        }

        return 'service';
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

    /** @return list<array<string, mixed>> */
    public static function auditTimeline(Invoice $invoice): array
    {
        return AuditLog::query()
            ->with('actor:id,name')
            ->where('auditable_type', Invoice::class)
            ->where('auditable_id', $invoice->id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(static fn (AuditLog $row) => [
                'id' => (string) $row->id,
                'at' => $row->created_at?->toIso8601String(),
                'action' => $row->action,
                'actor_name' => $row->actor?->name,
                'payload' => $row->payload,
            ])
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    public static function listRow(Invoice $invoice): array
    {
        $paidPence = $invoice->relationLoaded('payments')
            ? (int) $invoice->payments->sum(fn (Payment $p): int => (int) $p->amount_pence)
            : (int) $invoice->payments()->sum('amount_pence');

        /** @phpstan-ignore-next-line */
        $totalPence = (int) $invoice->total_pence;
        $outstanding = match ($invoice->invoice_status) {
            InvoiceStatus::Void, InvoiceStatus::Paid => 0,
            default => max(0, $totalPence - $paidPence),
        };

        $orderRef = null;
        $orderAdminRef = null;
        if ($invoice->relationLoaded('order') && $invoice->order !== null) {
            $orderAdminRef = OrderJson::reference($invoice->order);
            $orderRef = OrderJson::displayReference($invoice->order);
        }

        return [
            'id' => (string) $invoice->id,
            'display_reference' => self::adminReference($invoice),
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
            'paid_pence' => $paidPence,
            'outstanding_pence' => $outstanding,
            'subtotal_formatted' => MoneyFormatting::formatGbpFromPence((int) $invoice->subtotal_pence),
            'tax_total_formatted' => MoneyFormatting::formatGbpFromPence((int) $invoice->tax_pence),
            'formatted_amount' => MoneyFormatting::formatGbpFromPence((int) $invoice->total_pence),
            'formatted_paid' => MoneyFormatting::formatGbpFromPence($paidPence),
            'formatted_outstanding' => MoneyFormatting::formatGbpFromPence($outstanding),
            'currency' => $invoice->currency,
            'status' => $invoice->invoice_status?->value,
            'payment_status' => InvoiceRollup::paymentStatus($invoice),
            'overdue' => InvoiceRollup::isPastDue($invoice),
            'company_name' => $invoice->relationLoaded('company') && $invoice->company !== null ? $invoice->company->name : null,
            'linked_order' => $invoice->relationLoaded('order') && $invoice->order !== null ? [
                'reference' => $orderAdminRef,
                'display_reference' => $orderRef,
                'status' => $invoice->order->order_status?->value,
            ] : null,
            'updated_at' => $invoice->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public static function detail(Invoice $invoice): array
    {
        $invoice->loadMissing([
            'company:id,name,city,billing_email,phone',
            'order' => fn ($q) => $q->with('booking:id,scheduled_date,booking_status'),
            'items' => fn ($q) => $q->orderBy('created_at'),
            'payments' => fn ($q) => $q->orderByDesc('paid_at')->orderByDesc('created_at'),
        ]);

        $row = self::listRow($invoice);

        $row['items'] = $invoice->items->map(function (InvoiceItem $i): array {
            $qty = (int) $i->quantity;
            $unit = (int) $i->unit_amount_pence;
            $line = (int) $i->line_total_pence;

            return [
                'id' => (string) $i->id,
                'kind' => self::inferLineKind($i),
                'description' => $i->description,
                'quantity' => $qty,
                'unit_amount' => $unit,
                'line_total' => $line,
                'unit_amount_minor' => $unit,
                'line_total_minor' => $line,
                'unit_formatted' => MoneyFormatting::formatGbpFromPence($unit),
                'line_formatted' => MoneyFormatting::formatGbpFromPence($line),
            ];
        })->values()->all();

        $row['payments'] = $invoice->payments->map(fn ($p): array => PaymentJson::summary($p))->values()->all();

        $company = $invoice->company;
        $row['company'] = $company !== null ? [
            'name' => $company->name,
            'city' => $company->city,
            'billing_email' => $company->billing_email,
            'phone' => $company->phone,
        ] : null;

        $order = $invoice->order;
        $row['order'] = $order !== null ? [
            'id' => (string) $order->id,
            'reference' => OrderJson::reference($order),
            'display_reference' => OrderJson::displayReference($order),
            'status' => $order->order_status?->value,
            'booking' => $order->relationLoaded('booking') && $order->booking !== null ? [
                'reference' => BookingResource::reference($order->booking),
                'scheduled_date' => $order->booking->scheduled_date?->format('Y-m-d'),
            ] : null,
        ] : null;

        $row['is_subscription_billing'] = (bool) $invoice->is_subscription_billing;
        $row['subscription_summary'] = $invoice->is_subscription_billing
            ? 'Flagged as subscription billing — line detail follows your commercial setup.'
            : null;

        $row['audit_timeline'] = self::auditTimeline($invoice);

        return $row;
    }
}
