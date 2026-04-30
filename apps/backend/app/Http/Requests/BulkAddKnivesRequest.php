<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class BulkAddKnivesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'count' => ['required', 'integer', 'min:1', 'max:500'],
            'knife_type' => ['nullable', 'string', 'max:96'],
            'type_or_name' => ['nullable', 'string', 'max:120'],
            'condition_before' => ['nullable', 'string', 'max:20000'],
            'notes' => ['nullable', 'string', 'max:20000'],
            'price_per_knife_pence' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'description_prefix' => ['nullable', 'string', 'max:120'],
        ];
    }
}
