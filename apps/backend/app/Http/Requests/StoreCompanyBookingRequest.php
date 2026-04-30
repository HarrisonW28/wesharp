<?php

namespace App\Http\Requests;

use App\Enums\ServiceType;
use App\Models\Company;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCompanyBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        /** @var Company $company */
        $company = $this->route('company');

        return [
            'company_location_id' => [
                'required',
                'uuid',
                Rule::exists('company_locations', 'id')
                    ->where('company_id', $company->id)
                    ->whereNull('archived_at'),
            ],
            'scheduled_date' => ['required', 'date'],
            'service_type' => ['required', Rule::enum(ServiceType::class)],
            'internal_notes' => ['nullable', 'string', 'max:10000'],
        ];
    }
}
