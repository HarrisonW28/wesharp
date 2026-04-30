<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class StoreKnifeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'order_id' => ['nullable', 'uuid', Rule::exists('orders', 'id')],
            'company_id' => ['nullable', 'uuid', Rule::exists('companies', 'id')],
            'booking_id' => ['nullable', 'uuid', Rule::exists('bookings', 'id')],
            'knife_type' => ['nullable', 'string', 'max:96'],
            'brand' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:20000'],
            'condition_before' => ['nullable', 'string', 'max:20000'],
            'damage_notes' => ['nullable', 'string', 'max:20000'],
            'notes' => ['nullable', 'string', 'max:20000'],
            'label' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            /** @var array<string, mixed> $d */
            /** @phpstan-ignore-next-line */
            $d = $v->validated();
            /** @phpstan-ignore-next-line */
            $orderId = $d['order_id'] ?? null;
            /** @phpstan-ignore-next-line */
            $companyId = $d['company_id'] ?? null;

            if (($orderId === null || $orderId === '') && ($companyId === null || $companyId === '')) {
                $v->errors()->add('company_id', 'Provide company_id when no order_id is supplied.');

                return;
            }

            if ($orderId !== null && $orderId !== '' && $companyId !== null && $companyId !== '') {
                $v->errors()->add('company_id', 'Do not combine order_id with company_id in this MVP endpoint.');
            }
        });
    }
}
