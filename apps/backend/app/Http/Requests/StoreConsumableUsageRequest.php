<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreConsumableUsageRequest extends FormRequest
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
            'usage_date' => ['required', 'date'],
            'quantity_used' => ['required', 'numeric', 'min:0.001'],
            'order_id' => ['sometimes', 'nullable', 'uuid', 'exists:orders,id'],
            'route_id' => ['sometimes', 'nullable', 'uuid', 'exists:routes,id'],
            'knife_id' => ['sometimes', 'nullable', 'uuid', 'exists:knives,id'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:8000'],
        ];
    }
}
