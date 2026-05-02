<?php

declare(strict_types=1);

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
 * Promotes {@see InvoiceStatus::Sent} to {@see InvoiceStatus::Overdue} when due date is before today (UTC start of day).
 */
final class SyncInvoiceOverdueStatusAction
{
    public function __construct(
        private readonly InvoiceEmailService $invoiceEmails,
    ) {}

    public function execute(Invoice $invoice, ?Authenticatable $actor, ?Request $request): Invoice
    {
        /** @var array{invoice: Invoice, became_overdue: bool} $result */
        $result = DB::transaction(function () use ($invoice, $actor, $request): array {
            $invoice->refresh();

            $status = $invoice->invoice_status;
            if (! $status instanceof InvoiceStatus) {
                return ['invoice' => $invoice, 'became_overdue' => false];
            }

            if (! InvoiceStatusTransitions::canAutoOverdue($status)) {
                return ['invoice' => $invoice, 'became_overdue' => false];
            }

            $due = $invoice->due_on;
            if ($due === null) {
                return ['invoice' => $invoice, 'became_overdue' => false];
            }

            $dueYmd = $due instanceof \Carbon\CarbonInterface ? $due->toDateString() : (string) $due;
            if ($dueYmd >= now()->toDateString()) {
                return ['invoice' => $invoice, 'became_overdue' => false];
            }

            /** @phpstan-ignore-next-line */
            $invoice->invoice_status = InvoiceStatus::Overdue;
            $invoice->save();

            if ($actor !== null && $request !== null) {
                AuditRecorder::record($actor, $invoice, 'invoice.auto_overdue', [
                    'from' => InvoiceStatus::Sent->value,
                    'to' => InvoiceStatus::Overdue->value,
                    'due_on' => $due->toDateString(),
                ], $request);
            }

            return ['invoice' => $invoice->fresh(), 'became_overdue' => true];
        });

        if ($result['became_overdue']) {
            $this->invoiceEmails->sendInvoiceOverdue(
                $result['invoice']->loadMissing(['company', 'order.booking.contact', 'payments', 'items']),
            );
        }

        return $result['invoice'];
    }
}
