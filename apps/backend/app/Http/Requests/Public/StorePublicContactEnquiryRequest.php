<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePublicContactEnquiryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'contact_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:48'],
            'business_name' => ['nullable', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:20000'],
            'topic' => ['sometimes', 'nullable', 'string', Rule::in(['general', 'trade', 'subscription', 'coverage'])],
            'terms_accepted' => ['accepted'],
        ];
    }
}
