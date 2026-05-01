<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\InvoiceStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class FinanceDashboardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $statusValues = array_map(static fn (InvoiceStatus $s) => $s->value, InvoiceStatus::cases());

        return [
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'company_id' => ['nullable', 'uuid', 'exists:companies,id'],
            'invoice_status' => ['nullable', 'string', Rule::in($statusValues)],
        ];
    }
}
