<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\EvidencePhotoCategory;
use App\Enums\EvidencePhotoVisibility;
use App\Models\DamageReport;
use App\Models\Knife;
use App\Models\Order;
use App\Support\Http\ValidatedAttachmentRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class StoreOrderEvidencePhotoRequest extends FormRequest
{
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
            'category' => ['required', 'string', Rule::in(EvidencePhotoCategory::orderAndWorkshopValues())],
            'visibility' => ['sometimes', 'string', Rule::enum(EvidencePhotoVisibility::class)],
            'caption' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:10000'],
            'knife_id' => ['nullable', 'uuid', Rule::exists('knives', 'id')],
            'damage_report_id' => ['nullable', 'uuid', Rule::exists('damage_reports', 'id')],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            /** @var Order|null $order */
            $order = $this->route('order');
            if (! $order instanceof Order) {
                return;
            }

            $knifeId = $v->safe()->input('knife_id');
            if ($knifeId === null || $knifeId === '') {
                return;
            }

            /** @var Knife|null $knife */
            $knife = Knife::query()->find($knifeId);
            if ($knife === null) {
                return;
            }

            if ((string) $knife->company_id !== (string) $order->company_id) {
                $v->errors()->add('knife_id', 'Knife must belong to the same customer as this order.');
            }

            if ($knife->order_id !== null && (string) $knife->order_id !== (string) $order->id) {
                $v->errors()->add('knife_id', 'When this knife is on an order, it must match this order.');
            }

            $damageId = $v->safe()->input('damage_report_id');
            if ($damageId === null || $damageId === '') {
                return;
            }

            /** @var DamageReport|null $report */
            $report = DamageReport::query()->with('knife')->find($damageId);
            if ($report === null) {
                return;
            }

            if ((string) $report->company_id !== (string) $order->company_id) {
                $v->errors()->add('damage_report_id', 'Damage report must belong to the same customer as this order.');

                return;
            }

            $linkedToOrder = ((string) $report->order_id === (string) $order->id)
                || ($report->knife !== null && (string) $report->knife->order_id === (string) $order->id);

            if (! $linkedToOrder) {
                $v->errors()->add('damage_report_id', 'Damage report must be linked to this order.');
            }

            if ($knifeId !== null && $knifeId !== '' && (string) $knifeId !== (string) $report->knife_id) {
                $v->errors()->add('knife_id', 'Knife must match the damage report blade.');
            }
        });
    }
}
