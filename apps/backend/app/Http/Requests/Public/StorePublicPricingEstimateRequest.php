<?php

namespace App\Http\Requests\Public;

use App\Enums\ServiceType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePublicPricingEstimateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'knife_count' => ['required', 'integer', 'min:1', 'max:500'],
            'postcode' => ['nullable', 'string', 'max:24'],
            'programme_mode' => ['required', 'string', Rule::in(['pay_as_you_go', 'subscription'])],
            'service_type' => ['required', 'string', Rule::enum(ServiceType::class)],
            'visit_pattern' => ['required', 'string', Rule::in(['single', 'regular'])],
            'customer_kind' => ['required', 'string', Rule::in(['home', 'business'])],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('programme_mode') === 'subscription' && ! $this->has('service_type')) {
            $this->merge(['service_type' => ServiceType::Collection->value]);
        }
    }

    /** @return array<string, mixed> */
    public function estimatePayload(): array
    {
        /** @var array<string, mixed> $v */
        $v = $this->validated();

        return [
            'knife_count' => (int) $v['knife_count'],
            'postcode' => isset($v['postcode']) ? (string) $v['postcode'] : null,
            'programme_mode' => (string) $v['programme_mode'],
            'service_type' => ServiceType::from((string) $v['service_type']),
            'visit_pattern' => (string) $v['visit_pattern'],
            'customer_kind' => (string) $v['customer_kind'],
        ];
    }
}
