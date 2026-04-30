<?php

namespace App\Support\Payments;

use App\Models\Payment;
use App\Support\Money\MoneyFormatting;

final class PaymentJson
{
    /** @return array<string, mixed> */
    public static function summary(Payment $payment): array
    {
        return [
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
            'currency' => $payment->currency,
            'updated_at' => $payment->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public static function detail(Payment $payment): array
    {
        $payload = self::summary($payment);
        $payment->loadMissing(['company:id,name', 'invoice:id,invoice_number', 'order:id']);

        $payload['invoice'] = $payment->invoice !== null ? [
            'id' => (string) $payment->invoice->id,
            'invoice_number' => $payment->invoice->invoice_number,
        ] : null;

        return $payload;
    }
}
