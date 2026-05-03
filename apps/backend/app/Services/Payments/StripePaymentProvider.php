<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Contracts\Payments\PaymentProviderInterface;
use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\Payment;
use App\Support\Stripe\StripeCheckoutEnvironmentGuard;
use Stripe\Exception\ApiErrorException;

final class StripePaymentProvider implements PaymentProviderInterface
{
    public function __construct(
        private readonly StripeCheckoutSessionClient $checkoutSessions,
    ) {}

    public function driver(): string
    {
        return 'stripe';
    }

    public function invoiceHostedCheckoutPreview(Invoice $invoice): HostedCheckoutAvailability
    {
        $reason = $this->invoiceCheckoutBlockingReason($invoice);
        if ($reason !== null) {
            return new HostedCheckoutAvailability(false, $reason, null);
        }

        return new HostedCheckoutAvailability(true, null, null);
    }

    public function createInvoiceHostedCheckoutSession(Invoice $invoice): HostedCheckoutAvailability
    {
        $reason = $this->invoiceCheckoutBlockingReason($invoice);
        if ($reason !== null) {
            return new HostedCheckoutAvailability(false, $reason, null);
        }

        $invoice->loadMissing(['payments', 'company']);
        $received = (int) $invoice->payments->sum(fn (Payment $p): int => (int) $p->amount_pence);
        /** @phpstan-ignore-next-line */
        $total = (int) $invoice->total_pence;
        $outstanding = max(1, $total - $received);

        $successUrl = trim((string) config('stripe.checkout_success_url', ''));
        $cancelUrl = trim((string) config('stripe.checkout_cancel_url', ''));

        $metadata = [
            'invoice_id' => (string) $invoice->id,
            'company_id' => (string) $invoice->company_id,
            'order_id' => $invoice->order_id !== null ? (string) $invoice->order_id : '',
        ];

        $params = [
            'mode' => 'payment',
            'client_reference_id' => (string) $invoice->id,
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'line_items' => [
                [
                    'quantity' => 1,
                    'price_data' => [
                        'currency' => strtolower((string) $invoice->currency),
                        'unit_amount' => $outstanding,
                        'product_data' => [
                            'name' => 'Invoice '.(string) $invoice->invoice_number,
                        ],
                    ],
                ],
            ],
            'metadata' => $metadata,
            'payment_intent_data' => [
                'metadata' => $metadata,
            ],
        ];

        $company = $invoice->company;
        if ($company !== null && is_string($company->stripe_customer_id) && $company->stripe_customer_id !== '') {
            $params['customer'] = $company->stripe_customer_id;
        } elseif ($company !== null && is_string($company->billing_email) && trim($company->billing_email) !== '') {
            $params['customer_email'] = trim($company->billing_email);
        }

        try {
            $session = $this->checkoutSessions->createCheckoutSession($params, [
                'idempotency_key' => 'invoice_checkout_'.(string) $invoice->id,
            ]);
        } catch (ApiErrorException $e) {
            return new HostedCheckoutAvailability(
                false,
                'Stripe could not start checkout: '.$e->getMessage(),
                null,
            );
        }

        $sessionId = $session->id ?? null;
        $url = $session->url ?? null;
        if (! is_string($sessionId) || $sessionId === '' || ! is_string($url) || $url === '') {
            return new HostedCheckoutAvailability(false, 'Stripe returned an incomplete checkout session.', null);
        }

        $invoice->forceFill(['stripe_checkout_session_id' => $sessionId])->save();

        return new HostedCheckoutAvailability(true, null, $url);
    }

    private function invoiceCheckoutBlockingReason(Invoice $invoice): ?string
    {
        $env = StripeCheckoutEnvironmentGuard::blockingReason();
        if ($env !== null) {
            return $env;
        }

        $st = $invoice->invoice_status;
        if ($st === InvoiceStatus::Void) {
            return 'Void invoices cannot use checkout.';
        }

        if ($st === InvoiceStatus::Draft) {
            return 'Send the invoice before offering Stripe checkout.';
        }

        if ($st === InvoiceStatus::Paid) {
            return 'Invoice is already paid.';
        }

        $invoice->loadMissing('payments');
        $received = (int) $invoice->payments->sum(fn (Payment $p): int => (int) $p->amount_pence);
        /** @phpstan-ignore-next-line */
        $total = (int) $invoice->total_pence;
        if ($total - $received <= 0) {
            return 'Nothing outstanding on this invoice.';
        }

        return null;
    }
}
