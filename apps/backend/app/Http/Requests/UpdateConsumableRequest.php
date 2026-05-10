<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateConsumableRequest extends FormRequest
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
            'stock_quantity' => ['sometimes', 'numeric', 'min:0'],
            'stock_unit' => ['sometimes', 'nullable', 'string', 'max:64'],
            'reorder_threshold' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'reorder_note' => ['sometimes', 'nullable', 'string', 'max:8000'],
            'last_reorder_date' => ['sometimes', 'nullable', 'date'],
            'estimated_uses_per_unit' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'cost_per_knife_estimate_pence' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'status' => ['sometimes', 'string', Rule::in(['active', 'discontinued'])],
        ];
    }
}
