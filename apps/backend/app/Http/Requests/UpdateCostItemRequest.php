<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\CostFrequency;
use App\Enums\CostStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateCostItemRequest extends FormRequest
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
            'category_id' => ['sometimes', 'required', 'uuid', 'exists:cost_categories,id'],
            'tier_label' => ['sometimes', 'nullable', 'string', 'max:255'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:8000'],
            'amount_pence' => ['sometimes', 'required', 'integer', 'min:0'],
            'currency' => ['sometimes', 'nullable', 'string', 'size:3'],
            'frequency' => ['sometimes', 'required', Rule::enum(CostFrequency::class)],
            'status' => ['sometimes', 'required', Rule::enum(CostStatus::class), Rule::notIn([CostStatus::Archived->value])],
            'supplier_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'supplier_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'priority' => ['sometimes', 'nullable', 'integer', 'between:-32768,32767'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:8000'],
            'is_consumable' => ['sometimes', 'boolean'],
            'starts_on' => ['sometimes', 'nullable', 'date'],
            'ends_on' => ['sometimes', 'nullable', 'date'],
            'next_due_on' => ['sometimes', 'nullable', 'date'],
            'renews_on' => ['sometimes', 'nullable', 'date'],
            'commitment_cancellable' => ['sometimes', 'boolean'],
            'payment_method_note' => ['sometimes', 'nullable', 'string', 'max:8000'],
        ];
    }
}
