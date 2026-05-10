<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\CostFrequency;
use App\Enums\CostStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreCostItemRequest extends FormRequest
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
            'category_id' => ['required', 'uuid', 'exists:cost_categories,id'],
            'tier_label' => ['nullable', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:8000'],
            'amount_pence' => ['required', 'integer', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'frequency' => ['required', Rule::enum(CostFrequency::class)],
            'status' => ['required', Rule::enum(CostStatus::class), Rule::notIn([CostStatus::Archived->value])],
            'supplier_name' => ['nullable', 'string', 'max:255'],
            'supplier_url' => ['nullable', 'string', 'max:2048'],
            'priority' => ['nullable', 'integer', 'between:-32768,32767'],
            'notes' => ['nullable', 'string', 'max:8000'],
            'is_consumable' => ['sometimes', 'boolean'],
            'starts_on' => ['nullable', 'date'],
            'ends_on' => ['nullable', 'date'],
            'next_due_on' => ['nullable', 'date'],
            'renews_on' => ['nullable', 'date'],
            'commitment_cancellable' => ['sometimes', 'boolean'],
            'payment_method_note' => ['nullable', 'string', 'max:8000'],
        ];
    }
}
