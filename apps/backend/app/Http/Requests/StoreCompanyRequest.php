<?php

namespace App\Http\Requests;

use App\Enums\CompanyStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', 'unique:companies,slug'],
            'phone' => ['nullable', 'string', 'max:48'],
            'billing_email' => ['nullable', 'email', 'max:255'],
            'city' => ['nullable', 'string', 'max:191'],
            'company_status' => ['nullable', Rule::enum(CompanyStatus::class)],
        ];
    }
}
