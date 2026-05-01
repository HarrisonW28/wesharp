<?php

declare(strict_types=1);

namespace App\Actions\Invoices;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Services\Audit\AuditRecorder;
use App\Support\Invoices\InvoiceStatusTransitions;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ReopenInvoiceDraftAction
{
    public function execute(Invoice $invoice, ?Authenticatable $actor, Request $request): Invoice
    {
        return DB::transaction(function () use ($invoice, $actor, $request): Invoice {
            $invoice->refresh();

            /** @phpstan-ignore-next-line */
            $status = $invoice->invoice_status;
            if (! $status instanceof InvoiceStatus) {
                abort(422, 'Invalid invoice state.');
            }

            InvoiceStatusTransitions::assertReopenDraft($status);

            /** @phpstan-ignore-next-line */
            $received = (int) ($invoice->payments()->sum('amount_pence'));
            if ($received > 0) {
                abort(422, 'Cannot reopen as draft while payments exist. Void or adjust payments first.');
            }

            /** @phpstan-ignore-next-line */
            $from = $status->value;
            /** @phpstan-ignore-next-line */
            $invoice->invoice_status = InvoiceStatus::Draft;
            $invoice->save();

            AuditRecorder::record($actor, $invoice, 'invoice.reopened_draft', [
                'from' => $from,
                'to' => InvoiceStatus::Draft->value,
            ], $request);

            return $invoice->fresh([
                'company:id,name,city',
                'order:id,booking_id',
                'items',
                'payments',
            ]);
        });
    }
}
