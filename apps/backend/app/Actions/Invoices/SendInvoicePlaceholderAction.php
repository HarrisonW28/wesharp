<?php

namespace App\Actions\Invoices;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Services\Audit\AuditRecorder;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Placeholder: records audit only — real email/PDF integrations live behind PSP / mail tooling.
 */
final class SendInvoicePlaceholderAction
{
    public function execute(Invoice $invoice, ?Authenticatable $actor, Request $request): Invoice
    {
        return DB::transaction(function () use ($invoice, $actor, $request): Invoice {
            $invoice->refresh();

            if ($invoice->invoice_status !== InvoiceStatus::Draft) {
                abort(422, 'Only draft invoices can be sent from this MVP action.');
            }

            /** @phpstan-ignore-next-line */
            $invoice->invoice_status = InvoiceStatus::Sent;

            /** @phpstan-ignore-next-line */
            if ($invoice->issued_on === null) {
                /** @phpstan-ignore-next-line */
                $invoice->issued_on = now()->toDateString();
            }

            $invoice->save();

            AuditRecorder::record($actor, $invoice, 'invoice.send_placeholder', [
                /** @phpstan-ignore-next-line */
                'delivery' => 'pending_integration',
                'invoice_number' => $invoice->invoice_number,
            ], $request);

            return $invoice->fresh([
                /** @phpstan-ignore-next-line */
                'company:id,name,city',
                'order:id,booking_id',
                /** @phpstan-ignore-next-line */
                'items',
                'payments',
            ]);
        });
    }
}
