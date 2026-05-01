<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class RecordKnifeInspectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'inspection_condition' => ['nullable', 'string', 'max:255'],
            'inspection_notes' => ['nullable', 'string', 'max:20000'],
            'inspection_internal_notes' => ['nullable', 'string', 'max:20000'],
            'inspection_customer_visible' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('inspection_customer_visible')) {
            $v = $this->input('inspection_customer_visible');
            if ($v === '1' || $v === '0' || $v === 1 || $v === 0) {
                $this->merge([
                    'inspection_customer_visible' => filter_var($v, FILTER_VALIDATE_BOOLEAN),
                ]);
            }
        }
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $data = $v->getData();
            $has = static function (string $key) use ($data): bool {
                if (! array_key_exists($key, $data)) {
                    return false;
                }
                $val = $data[$key];

                return ! (is_string($val) && trim($val) === '') && $val !== null;
            };

            if (
                ! $has('inspection_condition')
                && ! $has('inspection_notes')
                && ! $has('inspection_internal_notes')
            ) {
                $v->errors()->add(
                    'inspection_notes',
                    'Provide at least one of inspection condition, inspection notes, or internal notes.'
                );
            }
        });
    }
}
