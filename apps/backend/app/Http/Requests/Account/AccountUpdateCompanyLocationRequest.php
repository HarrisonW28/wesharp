<?php

namespace App\Http\Requests\Account;

use Illuminate\Contracts\Validation\Validator;
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
            'postcode' => ['sometimes', 'string', 'max:24'],
            'country' => ['sometimes', 'nullable', 'string', 'max:120'],
            'latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $addressKeys = ['line_one', 'line_two', 'city', 'postcode', 'country'];
            $touched = false;
            foreach ($addressKeys as $key) {
                if ($this->has($key)) {
                    $touched = true;
                    break;
                }
            }

            if (! $touched) {
                return;
            }

            if (trim((string) $this->input('postcode', '')) === '') {
                $v->errors()->add('postcode', 'Postcode is required when updating the address.');
            }
        });
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'postcode.required' => 'Postcode is required.',
        ];
    }
}
