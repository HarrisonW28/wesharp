<?php

namespace App\Http\Requests\Account;

use Illuminate\Foundation\Http\FormRequest;

class AccountUpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->company_id !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'user' => ['sometimes', 'array'],
            'user.name' => ['sometimes', 'string', 'max:190'],
            'company' => ['sometimes', 'array'],
            'company.phone' => ['sometimes', 'nullable', 'string', 'max:120'],
            'company.billing_email' => ['sometimes', 'nullable', 'string', 'email', 'max:190'],
            'company.name' => ['sometimes', 'string', 'max:255'],
        ];
    }
}
