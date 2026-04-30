<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CompleteOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'invoice_draft' => ['sometimes', 'boolean'],
        ];
    }

    /** Whether the client expects a duplicate-safe draft invoice stub after completion. */
    public function wantsInvoiceDraft(): bool
    {
        return $this->boolean('invoice_draft');
    }
}
