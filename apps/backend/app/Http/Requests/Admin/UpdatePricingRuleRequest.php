<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\PricingRuleKind;
use App\Enums\ServiceType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdatePricingRuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'service_area_id' => ['sometimes', 'nullable', 'uuid', 'exists:service_areas,id'],
            'name' => ['sometimes', 'string', 'max:160'],
            'service_type' => ['sometimes', 'nullable', Rule::enum(ServiceType::class)],
            'rule_kind' => ['sometimes', Rule::enum(PricingRuleKind::class)],
            'priority' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'amount_pence' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100000000'],
            'constraints' => ['sometimes', 'nullable', 'array'],
            'constraints.minimum_units' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:10000'],
            'constraints.first_order_per_knife_pence' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100000000'],
            'active' => ['sometimes', 'boolean'],
        ];
    }
}
