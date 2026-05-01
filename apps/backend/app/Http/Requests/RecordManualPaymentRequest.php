<?php

namespace App\Http\Requests;

use App\Enums\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class RecordManualPaymentRequest extends FormRequest
{
    /** Methods allowed for staff manual entry (no PSP / Stripe capture). */
    private const MANUAL_METHODS = [
        PaymentMethod::Cash->value,
        PaymentMethod::Card->value,
        PaymentMethod::BankTransfer->value,
        PaymentMethod::Other->value,
        PaymentMethod::Manual->value,
        PaymentMethod::InvoiceLater->value,
    ];

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'invoice_id' => ['required', 'uuid', 'exists:invoices,id'],
            'amount_pence' => ['required', 'integer', 'min:1', 'max:1000000000'],
            'payment_method' => ['required', 'string', Rule::in(self::MANUAL_METHODS)],
            'reference' => ['nullable', 'string', 'max:20000'],
            'notes' => ['nullable', 'string', 'max:20000'],
            'paid_at' => ['nullable', 'date'],
        ];
    }
}
