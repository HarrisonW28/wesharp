<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePublicServiceAreaWaitlistRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'postcode' => ['required', 'string', 'min:2', 'max:24'],
            'customer_type' => ['required', 'string', Rule::in(['home', 'business', 'other'])],
            'estimated_knife_count' => ['nullable', 'integer', 'min:0', 'max:50000'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
