<?php

declare(strict_types=1);

namespace App\Support\Invoices;

use App\Enums\InvoiceLineItemType;
use App\Enums\InvoiceStatus;
use App\Http\Resources\BookingResource;
use App\Models\AuditLog;
use App\Models\Invoice;
use App\Support\Audit\AuditActionLabels;
use App\Support\Audit\AuditLogPresenter;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Support\Crm\CompanySoftDeletePresentation;
use App\Support\Money\MoneyFormatting;
use App\Support\Orders\OrderJson;
use App\Support\Payments\PaymentJson;
use App\Support\Stripe\StripeInvoicePresentation;

final class InvoiceJson
{
    /** @var list<string> */
    private const STATUS_TIMELINE_ACTIONS = [
        'invoice.created_from_order',
        'invoice.draft_generated',
        'invoice.send_placeholder',
        'invoice.sent',
        'invoice.marked_paid',
        'invoice.void',
        'invoice.reopened_draft',
        'invoice.auto_overdue',
        'invoice.updated_meta',
        'invoice.draft_lines_updated',
        'invoice.payment_recorded',
    ];

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

    /** Canonical line type for API / UI (persisted enum, else description heuristic). */
    public static function inferLineKind(InvoiceItem $item): string
    {
        return self::lineItemTypeValue($item);
    }

    public static function lineItemTypeValue(InvoiceItem $item): string
    {
        if ($item->line_item_type instanceof InvoiceLineItemType) {
            return $item->line_item_type->value;
        }

        return self::inferLegacyLineTypeFromDescription($item)->value;
    }

    private static function inferLegacyLineTypeFromDescription(InvoiceItem $item): InvoiceLineItemType
    {
        $d = strtolower($item->description);

        if (str_contains($d, 'subscription')) {
            return InvoiceLineItemType::Subscription;
        }

        if (str_contains($d, 'overage')) {
            return InvoiceLineItemType::Overage;
        }

        if (str_contains($d, 'adjust')) {
            return InvoiceLineItemType::Adjustment;
        }

        return InvoiceLineItemType::OneOffService;
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

        $customer = InvoicePresentation::customerStatus($invoice);

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
            'customer_status_label' => $customer['label'],
            'customer_status_hint' => $customer['hint'],
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
            'company:id,name,city,billing_email,phone,deleted_at',
            'order:id,created_at,order_status',
            'items' => fn ($q) => $q->orderBy('created_at'),
            'payments' => fn ($q) => $q->orderByDesc('paid_at')->orderByDesc('created_at'),
        ]);

        $row = self::portalListRow($invoice);

        $company = $invoice->company;
        $emb = CompanySoftDeletePresentation::embed($company);
        $row['company'] = $emb !== null && $company !== null ? array_merge($emb, [
            'billing_email' => $company->billing_email,
            'phone' => $company->phone,
        ]) : null;
        $row['issuer'] = self::issuerPayload();
        $row['default_payment_footer'] = (string) config('invoices.default_payment_footer', '');
        $row['customer_notes'] = $invoice->customer_notes;

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

        $row['payment'] = StripeInvoicePresentation::portalPaymentCta($invoice);

        $row['documents'] = [
            'pdf_download_available' => false,
            'print_available' => true,
        ];

        $received = (int) $invoice->payments->sum(fn (Payment $p): int => (int) $p->amount_pence);
        $row['paid_pence'] = $received;
        /** @phpstan-ignore-next-line */
        $totP = (int) $invoice->total_pence;
        $row['outstanding_pence'] = match ($invoice->invoice_status) {
            InvoiceStatus::Void, InvoiceStatus::Paid => 0,
            default => max(0, $totP - $received),
        };

        return $row;
    }

    /** @return list<array<string, mixed>> */
    public static function auditTimeline(Invoice $invoice): array
    {
        $rows = AuditLog::query()
            ->with('actor:id,name,email')
            ->where('auditable_type', Invoice::class)
            ->where('auditable_id', $invoice->id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return AuditLogPresenter::mapTimeline($rows, includeIp: true);
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
            'order_id' => $invoice->order_id !== null ? (string) $invoice->order_id : null,
            'source_type' => $invoice->source_type,
            'source_id' => $invoice->source_id,
            'billing_period_start' => $invoice->billing_period_start?->format('Y-m-d'),
            'billing_period_end' => $invoice->billing_period_end?->format('Y-m-d'),
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
            'company' => CompanySoftDeletePresentation::embed($invoice->relationLoaded('company') ? $invoice->company : null),
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
            'company:id,name,city,billing_email,phone,deleted_at',
            'order' => fn ($q) => $q->with('booking:id,scheduled_date,booking_status'),
            'items' => fn ($q) => $q->orderBy('created_at'),
            'payments' => fn ($q) => $q->with('recordedBy:id,name,email')->orderByDesc('paid_at')->orderByDesc('created_at'),
        ]);

        $row = self::listRow($invoice);

        $row['items'] = $invoice->items->map(function (InvoiceItem $i): array {
            $qty = (int) $i->quantity;
            $unit = (int) $i->unit_amount_pence;
            $line = (int) $i->line_total_pence;

            $type = self::lineItemTypeValue($i);

            return [
                'id' => (string) $i->id,
                'kind' => $type,
                'line_item_type' => $type,
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
        $emb = CompanySoftDeletePresentation::embed($company);
        $row['company'] = $emb !== null && $company !== null ? array_merge($emb, [
            'billing_email' => $company->billing_email,
            'phone' => $company->phone,
        ]) : null;

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
        $row['status_timeline'] = self::statusTimeline($invoice);
        $row['allowed_actions'] = self::allowedActions($invoice);
        $row['issuer'] = self::issuerPayload();
        $row['default_payment_footer'] = (string) config('invoices.default_payment_footer', '');
        $row['customer_notes'] = $invoice->customer_notes;
        $row['internal_notes'] = $invoice->internal_notes;
        $row['stripe'] = StripeInvoicePresentation::adminDetailPanel($invoice);

        return $row;
    }

    /**
     * @return array{legal_name: string, address_lines: list<string>, email: string|null, phone: string|null, vat_number: string|null}
     */
    public static function issuerPayload(): array
    {
        /** @var mixed $raw */
        $raw = config('invoices.issuer.address_lines', []);
        $lines = is_array($raw)
            ? array_values(array_filter(array_map(static fn ($l): string => is_string($l) ? $l : (string) $l, $raw)))
            : [];

        return [
            'legal_name' => (string) config('invoices.issuer.legal_name', 'WeSharp'),
            'address_lines' => $lines,
            'email' => config('invoices.issuer.email'),
            'phone' => config('invoices.issuer.phone'),
            'vat_number' => config('invoices.issuer.vat_number'),
        ];
    }

    /** @return list<array<string, mixed>> */
    public static function statusTimeline(Invoice $invoice): array
    {
        $rows = AuditLog::query()
            ->with('actor:id,name,email')
            ->where('auditable_type', Invoice::class)
            ->where('auditable_id', $invoice->id)
            ->whereIn('action', self::STATUS_TIMELINE_ACTIONS)
            ->orderBy('created_at')
            ->limit(80)
            ->get();

        $out = [];
        foreach ($rows as $log) {
            $out[] = [
                'id' => (string) $log->id,
                'at' => $log->created_at?->toIso8601String(),
                'action' => $log->action,
                'label' => AuditActionLabels::label((string) $log->action),
            ];
        }

        return $out;
    }

    /** @return array<string, bool> */
    public static function allowedActions(Invoice $invoice): array
    {
        $st = $invoice->invoice_status;
        if (! $st instanceof InvoiceStatus) {
            return [
                'send' => false,
                'mark_paid' => false,
                'void' => false,
                'reopen_draft' => false,
                'record_payment' => false,
                'edit_draft_lines' => false,
                'edit_draft_meta' => false,
            ];
        }

        $paidPence = $invoice->relationLoaded('payments')
            ? (int) $invoice->payments->sum(fn (Payment $p): int => (int) $p->amount_pence)
            : (int) $invoice->payments()->sum('amount_pence');

        $open = ! in_array($st, [InvoiceStatus::Paid, InvoiceStatus::Void], true);

        return [
            'send' => InvoiceStatusTransitions::canSend($st),
            'mark_paid' => InvoiceStatusTransitions::canMarkPaid($st),
            'void' => InvoiceStatusTransitions::canVoid($st),
            'reopen_draft' => InvoiceStatusTransitions::canReopenDraft($st) && $paidPence === 0,
            'record_payment' => $open && $st !== InvoiceStatus::Draft,
            'edit_draft_lines' => $st === InvoiceStatus::Draft,
            'edit_draft_meta' => $st === InvoiceStatus::Draft,
        ];
    }
}
