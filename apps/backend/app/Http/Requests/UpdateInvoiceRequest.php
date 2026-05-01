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
            'items' => ['sometimes', 'array', 'min:1', 'max:200'],
            'items.*.description' => ['required_with:items', 'string', 'max:2000'],
            'items.*.quantity' => ['required_with:items', 'integer', 'min:1', 'max:100000'],
            'items.*.unit_amount_pence' => ['required_with:items', 'integer', 'min:0', 'max:100000000'],
        ];
    }
}
