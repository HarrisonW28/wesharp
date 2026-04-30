<?php

namespace App\Http\Requests\Account;

use Illuminate\Foundation\Http\FormRequest;

class AccountStoreCompanyLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->company_id !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'label' => ['required', 'string', 'max:255'],
            'line_one' => ['required', 'string', 'max:512'],
            'line_two' => ['nullable', 'string', 'max:512'],
            'city' => ['required', 'string', 'max:255'],
            'postcode' => ['required', 'string', 'max:24'],
            'country' => ['nullable', 'string', 'max:120'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'label.required' => 'Give this site a short label (e.g. Main kitchen).',
            'line_one.required' => 'Address line one is required.',
            'city.required' => 'City or town is required.',
            'postcode.required' => 'Postcode is required.',
        ];
    }
}
