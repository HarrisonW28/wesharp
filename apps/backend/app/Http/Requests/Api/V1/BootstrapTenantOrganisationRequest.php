<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class BootstrapTenantOrganisationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            /** `sole_customer`: individual billing profile (stored as tenant row without forming a ltd-style company). */
            'registration_type' => ['sometimes', Rule::in(['business', 'sole_customer'])],
            'name' => ['required', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:191'],
            'phone' => ['nullable', 'string', 'max:48'],
            'billing_email' => ['nullable', 'email', 'max:255'],
        ];
    }

    /** @phpstan-return 'business'|'sole_customer' */
    public function registrationType(): string
    {
        /** @phpstan-ignore-next-line */
        $v = data_get($this->validated(), 'registration_type');

        /** @phpstan-ignore-next-line */
        return ($v === 'sole_customer') ? 'sole_customer' : 'business';
    }
}
