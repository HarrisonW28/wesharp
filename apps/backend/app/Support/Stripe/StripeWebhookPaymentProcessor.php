<?php

declare(strict_types=1);

namespace App\Support\Stripe;

use App\Actions\Payments\SettleInvoiceFromStripePaymentIntentAction;
use App\Models\Invoice;
use App\Services\Payments\StripeInvoiceCheckoutAttemptService;
use Illuminate\Support\Facades\Log;

/**
 * Invoice Checkout webhooks: idempotent settlement on payment intent id.
 */
final class StripeWebhookPaymentProcessor
{
    public function __construct(
        private readonly SettleInvoiceFromStripePaymentIntentAction $settleInvoiceFromStripePaymentIntent,
        private readonly StripeInvoiceCheckoutAttemptService $checkoutAttempts,
    ) {}

    /** @param  array<string, mixed>  $event */
    public function process(array $event): void
    {
        $type = isset($event['type']) && is_string($event['type']) ? $event['type'] : '';
        $object = $event['data']['object'] ?? null;
        if (! is_array($object)) {
            return;
        }

        match ($type) {
            'checkout.session.completed' => $this->onCheckoutSessionCompleted($object),
            'payment_intent.succeeded' => $this->onPaymentIntentSucceeded($object),
            'payment_intent.payment_failed' => $this->logPaymentIntentEvent('payment_intent.payment_failed', $object),
            'checkout.session.expired' => $this->logCheckoutSessionExpired($object),
            default => null,
        };
    }

    /**
     * @param  array<string, mixed>  $obj
     */
    private function onCheckoutSessionCompleted(array $obj): void
    {
        if (($obj['mode'] ?? '') === 'subscription') {
            return;
        }

        if (($obj['payment_status'] ?? '') !== 'paid') {
            return;
        }

        $paymentIntent = $obj['payment_intent'] ?? null;
        if (! is_string($paymentIntent) || $paymentIntent === '') {
            return;
        }

        if (! isset($obj['amount_total']) || ! is_int($obj['amount_total'])) {
            return;
        }

        $amountTotal = $obj['amount_total'];
        $metadataRaw = $obj['metadata'] ?? [];
        $metadata = is_array($metadataRaw) ? $metadataRaw : [];
        $invoiceId = $this->invoiceIdFromMetadata($metadata);
        if ($invoiceId === null) {
            return;
        }

        $checkoutSessionId = isset($obj['id']) && is_string($obj['id']) ? $obj['id'] : null;
        $this->settleForInvoice($invoiceId, $amountTotal, $paymentIntent, $checkoutSessionId);
    }

    /**
     * @param  array<string, mixed>  $obj
     */
    private function onPaymentIntentSucceeded(array $obj): void
    {
        if (! isset($obj['id']) || ! is_string($obj['id']) || $obj['id'] === '') {
            return;
        }

        $paymentIntentId = $obj['id'];
        if (! isset($obj['amount_received']) || ! is_int($obj['amount_received'])) {
            return;
        }

        $amountReceived = $obj['amount_received'];
        $metadataRaw = $obj['metadata'] ?? [];
        $metadata = is_array($metadataRaw) ? $metadataRaw : [];
        $invoiceId = $this->invoiceIdFromMetadata($metadata);
        if ($invoiceId === null) {
            return;
        }

        $this->settleForInvoice($invoiceId, $amountReceived, $paymentIntentId, null);
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private function invoiceIdFromMetadata(array $metadata): ?string
    {
        $invoiceId = $metadata['invoice_id'] ?? null;

        return is_string($invoiceId) && $invoiceId !== '' ? $invoiceId : null;
    }

    private function settleForInvoice(string $invoiceId, int $amountPence, string $paymentIntentId, ?string $checkoutSessionId): void
    {
        $invoice = Invoice::query()->find($invoiceId);
        if ($invoice === null) {
            Log::notice('stripe.webhook.invoice_not_found', ['invoice_id' => $invoiceId, 'payment_intent_id' => $paymentIntentId]);

            return;
        }

        try {
            $this->settleInvoiceFromStripePaymentIntent->execute(
                $invoice,
                $amountPence,
                $paymentIntentId,
                $checkoutSessionId,
                null,
            );
            if ($checkoutSessionId !== null) {
                $this->checkoutAttempts->markCompleted($checkoutSessionId);
            } else {
                $invoice->refresh();
                $sid = $invoice->stripe_checkout_session_id;
                if (is_string($sid) && $sid !== '') {
                    $this->checkoutAttempts->markCompleted($sid);
                }
            }
        } catch (\Throwable $e) {
            Log::error('stripe.webhook.settlement_failed', [
                'invoice_id' => $invoiceId,
                'payment_intent_id' => $paymentIntentId,
                'message' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $obj
     */
    private function logPaymentIntentEvent(string $type, array $obj): void
    {
        $id = isset($obj['id']) && is_string($obj['id']) ? $obj['id'] : null;
        Log::notice('stripe.webhook.'.$type, array_filter([
            'payment_intent_id' => $id,
            'invoice_id' => is_array($obj['metadata'] ?? null)
                ? $this->invoiceIdFromMetadata($obj['metadata'])
                : null,
        ]));
    }

    /**
     * @param  array<string, mixed>  $obj
     */
    private function logCheckoutSessionExpired(array $obj): void
    {
        $id = isset($obj['id']) && is_string($obj['id']) ? $obj['id'] : null;
        $mode = isset($obj['mode']) && is_string($obj['mode']) ? $obj['mode'] : null;
        Log::notice('stripe.webhook.checkout.session.expired', [
            'checkout_session_id' => $id,
            'mode' => $mode,
        ]);

        if ($mode === 'payment' && $id !== null && $id !== '') {
            $this->checkoutAttempts->markExpired($id);
        }
    }
}
