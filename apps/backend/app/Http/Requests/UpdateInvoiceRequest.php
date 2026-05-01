<?php

namespace App\Http\Requests;

use App\Enums\InvoiceLineItemType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'items.*.line_item_type' => ['sometimes', 'nullable', 'string', Rule::enum(InvoiceLineItemType::class)],
            'customer_notes' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'internal_notes' => ['sometimes', 'nullable', 'string', 'max:20000'],
        ];
    }
}
