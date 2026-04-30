<?php

namespace App\Http\Requests\Account;

use Illuminate\Foundation\Http\FormRequest;

class AccountUpdateCompanyLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->company_id !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'label' => ['sometimes', 'string', 'max:255'],
            'line_one' => ['sometimes', 'string', 'max:512'],
            'line_two' => ['sometimes', 'nullable', 'string', 'max:512'],
            'city' => ['sometimes', 'string', 'max:255'],
            'postcode' => ['sometimes', 'nullable', 'string', 'max:24'],
            'country' => ['sometimes', 'nullable', 'string', 'max:120'],
            'latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
        ];
    }
}
