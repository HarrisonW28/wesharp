<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\BillingInterval;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpsertSubscriptionPlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'billing_interval' => ['required', 'string', Rule::in(array_map(static fn (BillingInterval $i) => $i->value, BillingInterval::cases()))],
            'price_amount_minor' => ['required', 'integer', 'min:0', 'max:1000000000'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'included_collections' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:1000000'],
            'included_knife_allowance' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:1000000'],
            'overage_price_amount_minor' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:1000000000'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
        ];
    }

    /** @return array<string, mixed> */
    public function planPayload(): array
    {
        /** @var array<string, mixed> $v */
        $v = $this->validated();

        $currency = isset($v['currency']) && is_string($v['currency']) && $v['currency'] !== ''
            ? strtoupper($v['currency'])
            : 'GBP';

        return [
            'name' => trim((string) $v['name']),
            'description' => array_key_exists('description', $v) ? $v['description'] : null,
            'billing_interval' => BillingInterval::from((string) $v['billing_interval']),
            'price_amount_minor' => (int) $v['price_amount_minor'],
            'currency' => $currency,
            'included_collections' => array_key_exists('included_collections', $v) ? $v['included_collections'] : null,
            'included_knife_allowance' => array_key_exists('included_knife_allowance', $v) ? $v['included_knife_allowance'] : null,
            'overage_price_amount_minor' => array_key_exists('overage_price_amount_minor', $v) ? $v['overage_price_amount_minor'] : null,
            'is_active' => array_key_exists('is_active', $v) ? (bool) $v['is_active'] : true,
            'sort_order' => array_key_exists('sort_order', $v) ? (int) $v['sort_order'] : 0,
        ];
    }
}
