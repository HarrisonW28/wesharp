<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdatePaymentRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'reference' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:20000'],
        ];
    }
}
