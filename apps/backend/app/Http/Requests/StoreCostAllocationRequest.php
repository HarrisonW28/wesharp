<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\CostAllocationMethod;
use App\Enums\CostAllocationTargetType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreCostAllocationRequest extends FormRequest
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
            'cost_item_id' => ['sometimes', 'nullable', 'uuid', 'exists:cost_items,id'],
            'consumable_usage_id' => ['sometimes', 'nullable', 'uuid', 'exists:consumable_usages,id'],
            'target_type' => ['required', Rule::enum(CostAllocationTargetType::class)],
            'target_id' => ['required', 'uuid'],
            'amount_pence' => ['required', 'integer', 'min:1'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'allocation_method' => ['required', Rule::enum(CostAllocationMethod::class)],
            'notes' => ['sometimes', 'nullable', 'string', 'max:8000'],
        ];
    }
}
