<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreKnifeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'order_id' => ['required', 'uuid', 'exists:orders,id'],
            'knife_type' => ['nullable', 'string', 'max:96'],
            'description' => ['nullable', 'string', 'max:20000'],
            'condition_before' => ['nullable', 'string', 'max:20000'],
            'damage_notes' => ['nullable', 'string', 'max:20000'],
            'notes' => ['nullable', 'string', 'max:20000'],
            'label' => ['nullable', 'string', 'max:255'],
        ];
    }
}
