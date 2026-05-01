<?php

namespace App\Support\Payments;

use App\Models\Payment;
use App\Support\Money\MoneyFormatting;

final class PaymentJson
{
    /** Tenant-facing payment row — no internal entity IDs. */
    /** @return array<string, mixed> */
    public static function portalCustomerSummary(Payment $payment): array
    {
        return [
            'formatted_amount' => MoneyFormatting::formatGbpFromPence((int) $payment->amount_pence),
            'amount_pence' => (int) $payment->amount_pence,
            'status' => $payment->payment_status?->value,
            'method' => $payment->payment_method?->value,
            'paid_at' => $payment->paid_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public static function summary(Payment $payment): array
    {
        $row = [
            'id' => (string) $payment->id,
            'company_id' => (string) $payment->company_id,
            'order_id' => $payment->order_id !== null ? (string) $payment->order_id : null,
            'invoice_id' => $payment->invoice_id !== null ? (string) $payment->invoice_id : null,
            'amount' => $payment->amount_pence,
            'amount_minor' => (int) $payment->amount_pence,
            'formatted_amount' => MoneyFormatting::formatGbpFromPence((int) $payment->amount_pence),
            'method' => $payment->payment_method?->value,
            'status' => $payment->payment_status?->value,
            'paid_at' => $payment->paid_at?->toIso8601String(),
            'reference' => $payment->reference,
            'notes' => $payment->notes,
            'external_provider_id' => $payment->external_provider_id,
            'stripe_checkout_session_id' => $payment->stripe_checkout_session_id,
            'stripe_payment_intent_id' => $payment->stripe_payment_intent_id,
            'currency' => $payment->currency,
            'updated_at' => $payment->updated_at?->toIso8601String(),
        ];

        if ($payment->relationLoaded('recordedBy') && $payment->recordedBy !== null) {
            $actor = $payment->recordedBy;
            $row['recorded_by'] = [
                'id' => (string) $actor->id,
                'name' => $actor->name,
                'email' => $actor->email,
            ];
        } else {
            $row['recorded_by'] = null;
        }

        return $row;
    }

    /** @return array<string, mixed> */
    public static function detail(Payment $payment): array
    {
        $payment->loadMissing([
            'company:id,name',
            'invoice:id,invoice_number',
            'order:id',
            'recordedBy:id,name,email',
        ]);

        $payload = self::summary($payment);

        $payload['invoice'] = $payment->invoice !== null ? [
            'id' => (string) $payment->invoice->id,
            'invoice_number' => $payment->invoice->invoice_number,
        ] : null;

        return $payload;
    }
}
