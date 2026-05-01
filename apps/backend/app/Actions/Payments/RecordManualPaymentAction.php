<?php

namespace App\Actions\Payments;

use App\Enums\InvoiceStatus;
use App\Enums\OrderPaymentStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use App\Support\Permissions;
use Carbon\Carbon;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class RecordManualPaymentAction
{
    /**
     * @param  array{
     *   invoice_id:string,
     *   amount_pence:int,
     *   payment_method:string,
     *   reference:?string,
     *   notes:?string,
     *   paid_at:?string,
     * }  $validated
     */
    public function execute(
        Invoice $invoice,
        array $validated,
        ?Authenticatable $actor,
        Request $request,
    ): Payment {
        return DB::transaction(function () use ($invoice, $validated, $actor, $request): Payment {
            $invoice->refresh();

            if ($invoice->invoice_status === InvoiceStatus::Void) {
                abort(422, 'Cannot record payment against a void invoice.');
            }

            if ($invoice->invoice_status === InvoiceStatus::Draft) {
                abort(422, 'Cannot record payments against a draft invoice. Issue the invoice first.');
            }

            /** @phpstan-ignore-next-line */
            $received = (int) ($invoice->payments()->sum('amount_pence'));
            /** @phpstan-ignore-next-line */
            $total = (int) $invoice->total_pence;

            /** @phpstan-ignore-next-line */
            $incoming = max(1, (int) $validated['amount_pence']);
            /** @phpstan-ignore-next-line */
            $remaining = max(0, $total - $received);

            $actorUser = $actor instanceof User ? $actor : null;

            if ($invoice->invoice_status === InvoiceStatus::Paid) {
                if ($actorUser === null || ! Permissions::userMay($actorUser, Permissions::PAYMENTS_OVERRIDE)) {
                    abort(422, 'Invoice is already marked paid. Further payments require a payment override.');
                }
            }

            if ($incoming > $remaining) {
                /** @phpstan-ignore-next-line */
                if ($actorUser === null || ! Permissions::userMay($actorUser, Permissions::PAYMENTS_OVERRIDE)) {
                    abort(422, 'Manual payment exceeds remaining balance on this invoice.');
                }
            }

            /** @phpstan-ignore-next-line */
            $method = PaymentMethod::from($validated['payment_method']);

            $paidAt = isset($validated['paid_at'])
                ? Carbon::parse((string) $validated['paid_at'])
                : now();

            $statusPayment = PaymentStatus::PartPaid;

            /** @phpstan-ignore-next-line */
            if (($received + $incoming) >= $total) {
                /** @phpstan-ignore-next-line */
                $statusPayment = PaymentStatus::Paid;
            }

            /** @phpstan-ignore-next-line */
            /** @phpstan-ignore-next-line */
            $payment = Payment::query()->create([
                /** @phpstan-ignore-next-line */
                'company_id' => $invoice->company_id,
                /** @phpstan-ignore-next-line */
                'invoice_id' => $invoice->id,
                /** @phpstan-ignore-next-line */
                'order_id' => $invoice->order_id,
                /** @phpstan-ignore-next-line */
                'amount_pence' => $incoming,
                /** @phpstan-ignore-next-line */
                'payment_status' => $statusPayment,
                'payment_method' => $method,
                /** @phpstan-ignore-next-line */
                'currency' => $invoice->currency ?? 'GBP',
                /** @phpstan-ignore-next-line */
                'paid_at' => $paidAt,
                /** @phpstan-ignore-next-line */
                'reference' => $validated['reference'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'recorded_by' => $actorUser?->id,
            ]);

            /** @phpstan-ignore-next-line */
            $invoice->refresh();

            if (($received + $incoming) >= $total
                /** @phpstan-ignore-next-line */
                && ! in_array($invoice->invoice_status, [InvoiceStatus::Void, InvoiceStatus::Paid], false)) {
                /** @phpstan-ignore-next-line */
                $invoice->invoice_status = InvoiceStatus::Paid;
                $invoice->save();

                /** @phpstan-ignore-next-line */
                if ($invoice->order_id !== null) {
                    Order::query()->whereKey($invoice->order_id)->update([
                        'payment_status' => OrderPaymentStatus::Paid,
                    ]);
                }
            }

            AuditRecorder::record($actor, $payment, 'payment.recorded.manual', [
                /** @phpstan-ignore-next-line */
                'invoice_id' => (string) $invoice->id,
                /** @phpstan-ignore-next-line */
                'amount_pence' => $incoming,
                /** @phpstan-ignore-next-line */
                'method' => $method->value,
            ], $request);

            AuditRecorder::record($actor, $invoice, 'invoice.payment_recorded', [
                /** @phpstan-ignore-next-line */
                'payment_id' => (string) $payment->id,
                'amount_pence' => $incoming,
                'method' => $method->value,
                'received_total_pence' => $received + $incoming,
                /** @phpstan-ignore-next-line */
                'invoice_total_pence' => $total,
                'settled' => ($received + $incoming) >= $total,
            ], $request);

            /** @phpstan-ignore-next-line */
            return $payment->fresh([
                /** @phpstan-ignore-next-line */
                'invoice',
                'company',
                'order',
                'recordedBy:id,name,email',
            ]);
        });
    }
}
