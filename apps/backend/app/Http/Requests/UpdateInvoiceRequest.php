<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'due_date' => ['sometimes', 'nullable', 'date'],
            'issue_date' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
