<?php

namespace App\Actions\Invoices;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Services\Audit\AuditRecorder;
use App\Support\Invoices\InvoiceStatusTransitions;
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
            $st = $invoice->invoice_status;
            if (! $st instanceof InvoiceStatus) {
                abort(422, 'Invalid invoice state.');
            }
            if ($st === InvoiceStatus::Void) {
                abort(422, 'Invoice already void.');
            }
            InvoiceStatusTransitions::assertVoid($st);

            /** @phpstan-ignore-next-line */
            $before = $st->value;

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
