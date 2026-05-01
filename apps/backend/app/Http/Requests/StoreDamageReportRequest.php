<?php

namespace App\Http\Requests;

use App\Enums\DamageReportSeverity;
use App\Models\Knife;
use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class StoreDamageReportRequest extends FormRequest
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
            'description' => ['required', 'string', 'min:2', 'max:20000'],
            'severity' => ['required', Rule::enum(DamageReportSeverity::class)],
            'internal_notes' => ['nullable', 'string', 'max:20000'],
            'customer_visible' => ['sometimes', 'boolean'],
            'customer_description' => ['nullable', 'string', 'max:20000', 'required_if:customer_visible,true'],
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

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            /** @var Knife|null $knife */
            $knife = $this->route('knife');
            if (! $knife instanceof Knife) {
                return;
            }

            if ($knife->order_id === null) {
                $v->errors()->add('knife', 'This blade must be linked to an order before you can log structured damage.');

                return;
            }

            $orderId = (string) $this->input('order_id');
            if ((string) $knife->order_id !== $orderId) {
                $v->errors()->add('order_id', 'Order must match the blade’s current order.');

                return;
            }

            $order = Order::query()->find($orderId);
            if ($order === null || (string) $order->company_id !== (string) $knife->company_id) {
                $v->errors()->add('order_id', 'Order does not belong to this customer.');
            }
        });
    }
}
