<?php

namespace App\Http\Requests;

use App\Models\Order;
use App\Support\Http\ValidatedAttachmentRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class StoreKnifePhotoRequest extends FormRequest
{
    public const array PHOTO_KINDS = ['general', 'damage', 'before', 'after'];

    public const int MAX_KIB = 8192;

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            ...ValidatedAttachmentRules::imageField('photo', self::MAX_KIB),
            'caption' => ['nullable', 'string', 'max:500'],
            'photo_kind' => ['nullable', 'string', Rule::in(self::PHOTO_KINDS)],
            'order_id' => ['nullable', 'uuid', Rule::exists('orders', 'id')],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            /** @phpstan-ignore-next-line */
            $knife = $this->route('knife');
            if ($knife === null) {
                return;
            }

            $orderId = $v->safe()->input('order_id');
            if ($orderId === null || $orderId === '') {
                return;
            }

            $order = Order::query()->find($orderId);
            if ($order === null) {
                return;
            }

            if ((string) $order->company_id !== (string) $knife->company_id) {
                $v->errors()->add('order_id', 'Order must belong to the same customer as this knife.');
            }

            if ($knife->order_id !== null && (string) $knife->order_id !== (string) $orderId) {
                $v->errors()->add('order_id', 'When this knife is on an order, the photo order context must match.');
            }
        });
    }
}
