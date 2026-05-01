<?php

namespace App\Support\Invoices;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;

final class InvoiceRollup
{
    public static function paymentStatus(Invoice $invoice): string
    {
        if ($invoice->invoice_status === InvoiceStatus::Void) {
            return 'void';
        }

        if ($invoice->invoice_status === InvoiceStatus::Paid) {
            return 'paid';
        }

        $total = (int) ($invoice->total_pence ?? 0);

        if ($invoice->relationLoaded('payments')) {
            $received = (int) $invoice->payments->sum(fn ($p) => (int) $p->amount_pence);
        } else {
            $received = (int) ($invoice->payments()->sum('amount_pence'));
        }

        if ($total <= 0) {
            return $received <= 0 ? 'unpaid' : 'paid';
        }

        if ($received >= $total) {
            return 'paid';
        }

        return $received > 0 ? 'partial' : 'unpaid';
    }

    /** True when invoice is overdue (Sent / Overdue, due_date before today UTC). */
    public static function isPastDue(Invoice $invoice): bool
    {
        if ($invoice->invoice_status === InvoiceStatus::Void || $invoice->invoice_status === InvoiceStatus::Paid || $invoice->invoice_status === InvoiceStatus::Draft) {
            return false;
        }

        $due = $invoice->due_on;
        if ($due === null) {
            return false;
        }
        $dueYmd = $due instanceof \Carbon\CarbonInterface ? $due->toDateString() : (string) $due;

        return $dueYmd < now()->toDateString()
            && in_array($invoice->invoice_status, [InvoiceStatus::Sent, InvoiceStatus::Overdue], true);
    }
}
