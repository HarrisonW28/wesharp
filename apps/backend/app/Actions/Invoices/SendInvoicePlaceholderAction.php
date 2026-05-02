<?php

namespace App\Actions\Invoices;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Services\Audit\AuditRecorder;
use App\Services\Notifications\InvoiceEmailService;
use App\Support\Invoices\InvoiceStatusTransitions;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Issues (sends) the invoice to customers: updates status and queues the customer email.
 */
final class SendInvoicePlaceholderAction
{
    public function __construct(
        private readonly InvoiceEmailService $invoiceEmails,
    ) {}

    public function execute(Invoice $invoice, ?Authenticatable $actor, Request $request): Invoice
    {
        $updated = DB::transaction(function () use ($invoice, $actor, $request): Invoice {
            $invoice->refresh();

            /** @phpstan-ignore-next-line */
            $st = $invoice->invoice_status;
            if (! $st instanceof InvoiceStatus) {
                abort(422, 'Invalid invoice state.');
            }
            InvoiceStatusTransitions::assertSend($st);

            /** @phpstan-ignore-next-line */
            $fromStatus = $invoice->invoice_status->value;

            /** @phpstan-ignore-next-line */
            $invoice->invoice_status = InvoiceStatus::Sent;

            /** @phpstan-ignore-next-line */
            if ($invoice->issued_on === null) {
                /** @phpstan-ignore-next-line */
                $invoice->issued_on = now()->toDateString();
            }

            $invoice->save();

            AuditRecorder::record($actor, $invoice, 'invoice.sent', [
                'from' => $fromStatus,
                'to' => InvoiceStatus::Sent->value,
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

        $this->invoiceEmails->sendInvoiceIssued($updated);

        return $updated;
    }
}
