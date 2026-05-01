<?php

namespace App\Http\Requests;

use App\Enums\DamageReportSeverity;
use App\Enums\DamageReportStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateDamageReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'description' => ['sometimes', 'string', 'min:2', 'max:20000'],
            'severity' => ['sometimes', Rule::enum(DamageReportSeverity::class)],
            'internal_notes' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'customer_visible' => ['sometimes', 'boolean'],
            'customer_description' => ['sometimes', 'nullable', 'string', 'max:20000', 'required_if:customer_visible,true'],
            'status' => ['sometimes', Rule::in([
                DamageReportStatus::Open->value,
                DamageReportStatus::Resolved->value,
            ])],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('customer_visible')) {
            $v = $this->input('customer_visible');
            if ($v === '1' || $v === '0' || $v === 1 || $v === 0) {
                $this->merge([
                    'customer_visible' => filter_var($v, FILTER_VALIDATE_BOOLEAN),
                ]);
            }
        }
    }
}
