<?php

namespace App\Http\Requests;

use App\Enums\OrderPaymentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'booking_id' => ['sometimes', 'uuid', 'exists:bookings,id'],
            'route_id' => ['nullable', 'uuid', 'exists:routes,id'],
            'knife_count' => ['sometimes', 'integer', 'min:0', 'max:65000'],
            'price_per_knife_pence' => ['nullable', 'integer', 'min:0', 'max:10000000'],
            'discount_pence' => ['sometimes', 'integer', 'min:0', 'max:10000000'],
            'payment_status' => ['sometimes', Rule::enum(OrderPaymentStatus::class)],
            'currency' => ['sometimes', 'string', 'max:8'],
            'subtotal_pence' => ['sometimes', 'integer', 'min:0'],
            'tax_pence' => ['sometimes', 'integer', 'min:0'],
            'total_pence' => ['sometimes', 'integer', 'min:0'],
            'is_complimentary' => ['sometimes', 'boolean'],
            'manual_charge_subtotal_pence' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100000000'],
            'manual_charge_reason' => ['sometimes', 'nullable', 'string', 'max:20000'],
            /** Status moves only via lifecycle endpoints (`POST …/complete`). */
            'order_status' => ['prohibited'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $hasManual = $v->filled('manual_charge_subtotal_pence');
            $reason = trim((string) ($v->input('manual_charge_reason') ?? ''));
            if ($hasManual && $reason === '') {
                $v->errors()->add('manual_charge_reason', 'A reason is required when setting a manual charge subtotal.');
            }
            if ($v->has('manual_charge_reason') && $reason !== '' && ! $hasManual) {
                $v->errors()->add('manual_charge_subtotal_pence', 'Set a manual charge subtotal or clear the reason.');
            }
        });
    }
}
