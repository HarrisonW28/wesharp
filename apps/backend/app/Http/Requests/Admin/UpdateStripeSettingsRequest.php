<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class UpdateStripeSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'secret_key' => ['sometimes', 'nullable', 'string', 'max:512'],
            'public_key' => ['sometimes', 'nullable', 'string', 'max:512'],
            'webhook_secret' => ['sometimes', 'nullable', 'string', 'max:512'],
            'hosted_checkout_enabled' => ['sometimes', 'nullable', 'boolean'],
            'allow_live' => ['sometimes', 'nullable', 'boolean'],
            'checkout_success_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'checkout_cancel_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $this->assertKeyFormat($v, 'secret_key', ['sk_test_', 'sk_live_']);
            $this->assertKeyFormat($v, 'public_key', ['pk_test_', 'pk_live_']);
            $this->assertKeyFormat($v, 'webhook_secret', ['whsec_']);
        });
    }

    /**
     * @param  list<string>  $prefixes
     */
    private function assertKeyFormat(Validator $v, string $attribute, array $prefixes): void
    {
        if (! $this->has($attribute)) {
            return;
        }
        $val = $this->input($attribute);
        if ($val === null || $val === '') {
            return;
        }
        if (! is_string($val)) {
            return;
        }
        foreach ($prefixes as $prefix) {
            if (str_starts_with($val, $prefix)) {
                return;
            }
        }
        $v->errors()->add($attribute, 'Invalid '.$attribute.' format.');
    }
}
