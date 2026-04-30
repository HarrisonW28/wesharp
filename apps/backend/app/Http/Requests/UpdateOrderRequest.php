<?php

namespace App\Http\Requests;

use App\Enums\OrderPaymentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            /** Status moves only via lifecycle endpoints (`POST …/complete`). */
            'order_status' => ['prohibited'],
        ];
    }
}
