<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class BulkAddOrderItemsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.knife_id' => ['nullable', 'uuid', 'exists:knives,id'],
            'items.*.knife_type' => ['nullable', 'string', 'max:96'],
            'items.*.label' => ['nullable', 'string', 'max:255'],
            'items.*.brand' => ['nullable', 'string', 'max:120'],
            'items.*.notes' => ['nullable', 'string', 'max:20000'],
            'items.*.condition_before' => ['nullable', 'string', 'max:20000'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:500'],
            'items.*.unit_amount_pence' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            /** @var list<array<string, mixed>> $items */
            $items = $v->safe()->input('items', []);

            foreach ($items as $i => $row) {
                $kid = $row['knife_id'] ?? null;
                $hasKnife = $kid !== null && $kid !== '';

                if ($hasKnife && (int) ($row['quantity'] ?? 0) !== 1) {
                    $v->errors()->add("items.$i.quantity", 'Must be 1 when linking an existing knife.');
                }

                if (! $hasKnife) {
                    $type = trim((string) ($row['knife_type'] ?? ''));
                    $label = trim((string) ($row['label'] ?? ''));
                    if ($type === '' && $label === '') {
                        $v->errors()->add("items.$i.knife_type", 'Provide knife_type or label for new knives.');
                    }
                }
            }
        });
    }
}
