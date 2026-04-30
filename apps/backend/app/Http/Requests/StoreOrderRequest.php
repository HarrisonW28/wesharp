<?php

namespace App\Http\Requests;

use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Models\Booking;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'company_id' => ['required', 'uuid', 'exists:companies,id'],
            'booking_id' => ['required', 'uuid', 'exists:bookings,id'],
            'route_id' => ['nullable', 'uuid', 'exists:routes,id'],
            'order_status' => ['sometimes', Rule::enum(OrderStatus::class)],
            'knife_count' => ['sometimes', 'integer', 'min:0', 'max:65000'],
            'price_per_knife_pence' => ['nullable', 'integer', 'min:0', 'max:10000000'],
            'discount_pence' => ['sometimes', 'integer', 'min:0', 'max:10000000'],
            'payment_status' => ['sometimes', Rule::enum(OrderPaymentStatus::class)],
            'currency' => ['sometimes', 'string', 'max:8'],
            'subtotal_pence' => ['sometimes', 'integer', 'min:0'],
            'tax_pence' => ['sometimes', 'integer', 'min:0'],
            'total_pence' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    public function prepareForValidation(): void
    {
        if ($this->booking_id === null) {
            return;
        }

        $booking = Booking::query()->find($this->booking_id);
        if ($booking === null) {
            return;
        }

        if ((string) $booking->company_id !== (string) $this->input('company_id')) {
            abort(422, 'Booking company_id must match order company_id.');
        }

        /** @phpstan-ignore-next-line */
        $routeIdInput = $this->input('route_id');
        if (
            $routeIdInput !== null
            /** @phpstan-ignore-next-line */
            && optional($booking->assigned_route_id) !== null
            && (string) $booking->assigned_route_id !== (string) $routeIdInput
        ) {
            abort(422, 'Route does not match the booking assignment.');
        }
