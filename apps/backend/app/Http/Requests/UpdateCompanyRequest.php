<?php

namespace App\Http\Requests;

use App\Enums\CompanyStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        /** @var string $companyId */
        $companyId = $this->route('company')->id;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('companies', 'slug')->ignore($companyId)],
            'phone' => ['nullable', 'string', 'max:48'],
            'billing_email' => ['nullable', 'email', 'max:255'],
            'city' => ['nullable', 'string', 'max:191'],
            'company_status' => ['sometimes', Rule::enum(CompanyStatus::class)],
        ];
    }
}
