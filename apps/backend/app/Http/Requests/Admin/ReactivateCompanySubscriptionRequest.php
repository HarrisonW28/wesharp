<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ReactivateCompanySubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'subscription_plan_id' => ['sometimes', 'nullable', 'uuid', Rule::exists('subscription_plans', 'id')],
            'starts_at' => ['required', 'date'],
            'renews_at' => ['sometimes', 'nullable', 'date', 'after_or_equal:starts_at'],
            'billing_contact_id' => ['sometimes', 'nullable', 'uuid'],
            'price_amount_minor_snapshot' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:1000000000'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:8000'],
            'allow_inactive_plan' => ['sometimes', 'boolean'],
        ];
    }
}
