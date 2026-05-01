<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\KnifeStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Fluent;
use Illuminate\Validation\Rule;

final class BulkOrderWorkshopRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'mode' => ['required', 'string', Rule::in([
                'knife_status',
                'append_notes',
                'knife_type',
                'line_prices',
                'inspection_visibility',
            ])],
            'knife_ids' => ['sometimes', 'array', 'max:300'],
            'knife_ids.*' => ['uuid', 'distinct'],
            'line_item_ids' => ['sometimes', 'array', 'max:300'],
            'line_item_ids.*' => ['uuid', 'distinct'],
            'target_status' => ['required_if:mode,knife_status', 'nullable', 'string', Rule::enum(KnifeStatus::class)],
            'append_notes' => ['required_if:mode,append_notes', 'string', 'min:1', 'max:5000'],
            'knife_type' => ['required_if:mode,knife_type', 'nullable', 'string', 'min:1', 'max:120'],
            'unit_amount_pence' => ['required_if:mode,line_prices', 'nullable', 'integer', 'min:0'],
            'inspection_customer_visible' => ['required_if:mode,inspection_visibility', 'boolean'],
            'confirm_price_change' => ['nullable'],
            'confirm_customer_visibility' => ['nullable'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->sometimes('confirm_price_change', 'accepted', function (Fluent $input): bool {
            return ($input->mode ?? '') === 'line_prices';
        });
        $validator->sometimes('confirm_customer_visibility', 'accepted', function (Fluent $input): bool {
            return ($input->mode ?? '') === 'inspection_visibility';
        });

        $validator->after(function ($v): void {
            /** @var \Illuminate\Validation\Validator $v */
            $mode = (string) $this->input('mode', '');
            $knifeIds = $this->input('knife_ids', []);
            $lineIds = $this->input('line_item_ids', []);
            if (! is_array($knifeIds)) {
                $knifeIds = [];
            }
            if (! is_array($lineIds)) {
                $lineIds = [];
            }

            if ($mode === 'knife_status' && $knifeIds === [] && $lineIds === []) {
                $v->errors()->add('knife_ids', 'Select at least one blade or line for a status update.');
            }
            if (in_array($mode, ['append_notes', 'knife_type', 'inspection_visibility'], true) && $knifeIds === []) {
                $v->errors()->add('knife_ids', 'Select at least one blade for this bulk action.');
            }
            if ($mode === 'line_prices' && $lineIds === []) {
                $v->errors()->add('line_item_ids', 'Select at least one billable line to update pricing.');
            }
        });
    }
}
