<?php

namespace App\Actions\Invoices;

use App\Enums\InvoiceStatus;
use App\Enums\OrderPaymentStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use App\Support\Invoices\InvoiceStatusTransitions;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class MarkInvoicePaidAction
{
    public function execute(Invoice $invoice, ?Authenticatable $actor, Request $request): Invoice
    {
        /** @phpstan-ignore-next-line */
        return DB::transaction(function () use ($invoice, $actor, $request): Invoice {
            $invoice->refresh();

            /** @phpstan-ignore-next-line */
            $st = $invoice->invoice_status;
            if (! $st instanceof InvoiceStatus) {
                abort(422, 'Invalid invoice state.');
            }
            if ($st === InvoiceStatus::Paid) {
                abort(422, 'Invoice is already marked paid.');
            }
            InvoiceStatusTransitions::assertMarkPaid($st);

            /** @phpstan-ignore-next-line */
            $received = (int) ($invoice->payments()->sum('amount_pence'));
            /** @phpstan-ignore-next-line */
            $total = (int) $invoice->total_pence;

            /** @phpstan-ignore-next-line */
            if ($received < $total) {
                /** @phpstan-ignore-next-line */
                Payment::query()->create([
                    /** @phpstan-ignore-next-line */
                    'company_id' => $invoice->company_id,
                    /** @phpstan-ignore-next-line */
                    'invoice_id' => $invoice->id,
                    /** @phpstan-ignore-next-line */
                    'order_id' => $invoice->order_id,
                    /** @phpstan-ignore-next-line */
                    'amount_pence' => $total - $received,
                    /** @phpstan-ignore-next-line */
                    'payment_status' => PaymentStatus::Paid,
                    /** @phpstan-ignore-next-line */
                    'payment_method' => PaymentMethod::Manual,
                    /** @phpstan-ignore-next-line */
                    'currency' => $invoice->currency ?? 'GBP',
                    /** @phpstan-ignore-next-line */
                    'paid_at' => now(),
                    'reference' => 'SETTLE:'.$invoice->invoice_number,
                    'recorded_by' => $actor instanceof User ? $actor->id : null,
                ]);
            }

            /** @phpstan-ignore-next-line */
            $invoice->invoice_status = InvoiceStatus::Paid;
            $invoice->save();

            /** @phpstan-ignore-next-line */
            if ($invoice->order_id !== null) {
                Order::query()->whereKey($invoice->order_id)->update([
                    /** @phpstan-ignore-next-line */
                    'payment_status' => OrderPaymentStatus::Paid,
                ]);
            }

            AuditRecorder::record($actor, $invoice, 'invoice.marked_paid', [
                /** @phpstan-ignore-next-line */
                'invoice_id' => (string) $invoice->id,
            ], $request);

            return $invoice->fresh([
                /** @phpstan-ignore-next-line */
                'payments',
                'items',
                /** @phpstan-ignore-next-line */
                'company:id,name,city',
                'order:id,booking_id',
            ]);
        });
    }
}
