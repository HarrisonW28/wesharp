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
            'condition_before' => ['nullable', 'string', 'max:20000'],
            'description_prefix' => ['nullable', 'string', 'max:120'],
        ];
    }
}
