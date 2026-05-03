<?php

namespace App\Http\Requests\Account;

use Illuminate\Contracts\Validation\Validator;
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
            'user.accept_portal_terms' => ['sometimes', 'boolean'],
            'user.marketing_opt_in' => ['sometimes', 'boolean'],
            'user.email_notification_preferences' => ['sometimes', 'array'],
            'user.email_notification_preferences.booking_updates' => ['sometimes', 'boolean'],
            'user.email_notification_preferences.order_updates' => ['sometimes', 'boolean'],
            'user.email_notification_preferences.subscription_digest' => ['sometimes', 'boolean'],
            'company' => ['sometimes', 'array'],
            'company.name' => ['sometimes', 'string', 'max:255'],
            'company.city' => ['sometimes', 'nullable', 'string', 'max:255'],
            'company.phone' => ['sometimes', 'nullable', 'string', 'max:120'],
            'company.billing_email' => ['sometimes', 'nullable', 'string', 'email', 'max:190'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $company = $this->input('company');
            if (! is_array($company)) {
                return;
            }

            $meaningful = false;
            foreach (['name', 'city', 'phone', 'billing_email'] as $key) {
                if (! array_key_exists($key, $company)) {
                    continue;
                }
                $val = $company[$key];
                if ($val !== null && trim((string) $val) !== '') {
                    $meaningful = true;
                    break;
                }
            }

            if (! $meaningful) {
                return;
            }

            $name = isset($company['name']) ? trim((string) $company['name']) : '';
            if ($name === '') {
                $v->errors()->add('company.name', 'Trading name is required when updating business details.');
            }
        });
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'company.billing_email.email' => 'Enter a valid billing email address.',
        ];
    }
}
