<?php

namespace App\Http\Requests;

use Illuminate\Foundation\FormRequest;

class StoreInvoiceRequest extends FormRequest
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
            'issue_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
        ];
    }
}
