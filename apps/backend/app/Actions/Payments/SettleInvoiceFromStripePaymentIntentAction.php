<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Enums\InvoiceStatus;
use App\Enums\OrderPaymentStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Audit\AuditRecorder;
use App\Services\Notifications\InvoiceEmailService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Authoritative settlement for Stripe Checkout: call only from verified webhooks.
 * Idempotent on {@see Payment::$stripe_payment_intent_id} (unique).
 */
final class SettleInvoiceFromStripePaymentIntentAction
{
    public function __construct(
        private readonly InvoiceEmailService $invoiceEmails,
    ) {}

    public function execute(
        Invoice $invoice,
        int $amountPence,
        string $paymentIntentId,
        ?string $checkoutSessionId,
        ?Request $request = null,
    ): ?Payment {
        if ($paymentIntentId === '') {
            return null;
        }

        /** @var ?Payment $existing */
        $existing = Payment::query()->where('stripe_payment_intent_id', $paymentIntentId)->first();
        if ($existing !== null) {
            return $existing;
        }

        /** @var array{payment: Payment, notify: bool} $result */
        $result = DB::transaction(function () use ($invoice, $amountPence, $paymentIntentId, $checkoutSessionId, $request): array {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);
            $invoice->refresh();

            if ($invoice->invoice_status === InvoiceStatus::Void) {
                Log::warning('stripe.settlement.skipped_void_invoice', [
                    'invoice_id' => (string) $invoice->id,
                    'payment_intent_id' => $paymentIntentId,
                ]);

                throw new \RuntimeException('Cannot settle Stripe payment for void invoice.');
            }

            if ($invoice->invoice_status === InvoiceStatus::Draft) {
                Log::warning('stripe.settlement.skipped_draft_invoice', [
                    'invoice_id' => (string) $invoice->id,
                    'payment_intent_id' => $paymentIntentId,
                ]);

                throw new \RuntimeException('Cannot settle Stripe payment for draft invoice.');
            }

            /** @var ?Payment $raceExisting */
            $raceExisting = Payment::query()->where('stripe_payment_intent_id', $paymentIntentId)->first();
            if ($raceExisting !== null) {
                return ['payment' => $raceExisting, 'notify' => false];
            }

            $received = (int) $invoice->payments()->sum('amount_pence');
            /** @phpstan-ignore-next-line */
            $total = (int) $invoice->total_pence;
            $incoming = max(1, $amountPence);
            $remaining = max(0, $total - $received);

            if ($incoming > $remaining) {
                Log::warning('stripe.settlement.amount_over_remaining', [
                    'invoice_id' => (string) $invoice->id,
                    'payment_intent_id' => $paymentIntentId,
                    'incoming_pence' => $incoming,
                    'remaining_pence' => $remaining,
                ]);

                throw new \RuntimeException('Stripe amount exceeds remaining invoice balance.');
            }

            if ($remaining <= 0) {
                Log::notice('stripe.settlement.no_outstanding_balance', [
                    'invoice_id' => (string) $invoice->id,
                    'payment_intent_id' => $paymentIntentId,
                ]);

                throw new \RuntimeException('No outstanding balance on invoice.');
            }

            $paidAt = now();
            $statusPayment = ($received + $incoming) >= $total
                ? PaymentStatus::Paid
                : PaymentStatus::PartPaid;

            /** @phpstan-ignore-next-line */
            try {
                $payment = Payment::query()->create([
                    'company_id' => $invoice->company_id,
                    'invoice_id' => $invoice->id,
                    'order_id' => $invoice->order_id,
                    'amount_pence' => $incoming,
                    'payment_status' => $statusPayment,
                    'payment_method' => PaymentMethod::Stripe,
                    'currency' => $invoice->currency ?? 'GBP',
                    'paid_at' => $paidAt,
                    'reference' => $paymentIntentId,
                    'notes' => $checkoutSessionId !== null ? 'Stripe Checkout · '.$checkoutSessionId : 'Stripe Checkout',
                    'recorded_by' => null,
                    'stripe_checkout_session_id' => $checkoutSessionId,
                    'stripe_payment_intent_id' => $paymentIntentId,
                ]);
            } catch (QueryException $e) {
                if (str_contains(strtolower($e->getMessage()), 'stripe_payment_intent_id') || str_contains(strtolower($e->getMessage()), 'unique')) {
                    /** @var Payment $race */
                    $race = Payment::query()->where('stripe_payment_intent_id', $paymentIntentId)->firstOrFail();

                    return [
                        'payment' => $race,
                        'notify' => false,
                    ];
                }

                throw $e;
            }

            $invoice->refresh();

            if (($received + $incoming) >= $total
                && ! in_array($invoice->invoice_status, [InvoiceStatus::Void, InvoiceStatus::Paid], true)) {
                $invoice->invoice_status = InvoiceStatus::Paid;
                /** @phpstan-ignore-next-line */
                $invoice->stripe_payment_intent_id = $paymentIntentId;
                $invoice->save();

                if ($invoice->order_id !== null) {
                    Order::query()->whereKey($invoice->order_id)->update([
                        'payment_status' => OrderPaymentStatus::Paid,
                    ]);
                }
            }

            AuditRecorder::record(null, $payment, 'payment.recorded.stripe', [
                'invoice_id' => (string) $invoice->id,
                'amount_pence' => $incoming,
                'stripe_payment_intent_id' => $paymentIntentId,
                'stripe_checkout_session_id' => $checkoutSessionId,
            ], $request);

            AuditRecorder::record(null, $invoice, 'invoice.payment_recorded', [
                'payment_id' => (string) $payment->id,
                'amount_pence' => $incoming,
                'method' => PaymentMethod::Stripe->value,
                'received_total_pence' => $received + $incoming,
                'invoice_total_pence' => $total,
                'settled' => ($received + $incoming) >= $total,
                'source' => 'stripe_webhook',
            ], $request);

            /** @phpstan-ignore-next-line */
            return [
                'payment' => $payment->fresh([
                    'invoice',
                    'company',
                    'order',
                ]),
                'notify' => true,
            ];
        });

        if ($result['notify']) {
            $this->invoiceEmails->sendPaymentReceived(
                $invoice->fresh(['company', 'order.booking.contact', 'payments', 'items']),
                $result['payment'],
            );
        }

        return $result['payment'];
    }
}
