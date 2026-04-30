<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateKnifeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'knife_type' => ['sometimes', 'string', 'max:96'],
            'brand' => ['sometimes', 'nullable', 'string', 'max:120'],
            'description' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'condition_before' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'damage_notes' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'label' => ['sometimes', 'nullable', 'string', 'max:255'],
            'knife_status' => ['prohibited'],
            'tag_id' => ['prohibited'],
        ];
    }
}
