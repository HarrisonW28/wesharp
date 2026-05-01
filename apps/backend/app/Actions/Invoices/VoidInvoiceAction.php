<?php

namespace App\Actions\Invoices;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Services\Audit\AuditRecorder;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class VoidInvoiceAction
{
    public function execute(Invoice $invoice, ?Authenticatable $actor, Request $request, ?string $reason = null): Invoice
    {
        return DB::transaction(function () use ($invoice, $actor, $request, $reason): Invoice {
            $invoice->refresh();

            /** @phpstan-ignore-next-line */
            if ($invoice->invoice_status === InvoiceStatus::Paid) {
                abort(422, 'Paid invoices cannot be voided.');
            }

            if ($invoice->invoice_status === InvoiceStatus::Void) {
                abort(422, 'Invoice already void.');
            }

            /** @phpstan-ignore-next-line */
            $before = $invoice->invoice_status instanceof InvoiceStatus
                /** @phpstan-ignore-next-line */
                ? $invoice->invoice_status->value
                : (string) $invoice->invoice_status;

            /** @phpstan-ignore-next-line */
            $invoice->invoice_status = InvoiceStatus::Void;
            $invoice->save();

            AuditRecorder::record($actor, $invoice, 'invoice.void', [
                'before' => $before,
                'after' => InvoiceStatus::Void->value,
                'reason' => $reason,
            ], $request);

            return $invoice->fresh([
                /** @phpstan-ignore-next-line */
                'company:id,name,city',
                'order:id,booking_id',
                'items',
                'payments',
            ]);
        });
    }
}
