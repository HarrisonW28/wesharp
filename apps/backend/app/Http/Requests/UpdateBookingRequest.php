<?php

namespace App\Http\Requests;

use App\Enums\ServiceType;
use App\Models\Booking;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        /** @var Booking|null $booking */
        $booking = $this->route('booking');
        $companyId = $booking?->company_id ?? $this->input('company_id');

        $contactRule = $companyId !== null && $companyId !== ''
            ? Rule::exists('contacts', 'id')->where('company_id', $companyId)
            : Rule::exists('contacts', 'id');

        return [
            'company_id' => ['sometimes', 'uuid', 'exists:companies,id'],
            'contact_id' => [
                'nullable',
                'uuid',
                $contactRule,
            ],
            'requested_date' => ['sometimes', 'date'],
            'time_window_start' => ['nullable', 'date_format:H:i'],
            'time_window_end' => ['nullable', 'date_format:H:i'],
            'service_type' => ['sometimes', Rule::enum(ServiceType::class)],
            'estimated_knife_count' => ['nullable', 'integer', 'min:0', 'max:65000'],
            'actual_knife_count' => ['nullable', 'integer', 'min:0', 'max:65000'],
            'customer_notes' => ['nullable', 'string', 'max:20000'],
            'internal_notes' => ['nullable', 'string', 'max:20000'],
            'price_estimate' => ['nullable', 'integer', 'min:0'],
            /** Status changes MUST use dedicated lifecycle endpoints — never mass-assign here. */
            'status' => ['prohibited'],
            'booking_status' => ['prohibited'],
        ];
    }
}
