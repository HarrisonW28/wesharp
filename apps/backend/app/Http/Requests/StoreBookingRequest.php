<?php

namespace App\Http\Requests;

use App\Enums\ServiceType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $companyId = $this->input('company_id');

        return [
            'company_id' => ['required', 'uuid', 'exists:companies,id'],
            'location_id' => [
                'required',
                'uuid',
                Rule::exists('company_locations', 'id')->where('company_id', $companyId),
            ],
            'contact_id' => [
                'nullable',
                'uuid',
                Rule::exists('contacts', 'id')->where('company_id', $companyId),
            ],
            'requested_date' => ['required', 'date'],
            'time_window_start' => ['nullable', 'date_format:H:i'],
            'time_window_end' => ['nullable', 'date_format:H:i'],
            'service_type' => ['required', Rule::enum(ServiceType::class)],
            'estimated_knife_count' => ['nullable', 'integer', 'min:0', 'max:65000'],
            'actual_knife_count' => ['nullable', 'integer', 'min:0', 'max:65000'],
            'customer_notes' => ['nullable', 'string', 'max:20000'],
            'internal_notes' => ['nullable', 'string', 'max:20000'],
            'price_estimate' => ['nullable', 'integer', 'min:0'],
        ];
    }

}
