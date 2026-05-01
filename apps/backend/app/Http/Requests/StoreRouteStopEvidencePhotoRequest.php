<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\EvidencePhotoCategory;
use App\Enums\EvidencePhotoVisibility;
use App\Models\Knife;
use App\Models\RouteStop;
use App\Support\Http\ValidatedAttachmentRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class StoreRouteStopEvidencePhotoRequest extends FormRequest
{
    public const int MAX_KIB = 8192;

    /** @return list<string> */
    private static function stopCategories(): array
    {
        return [
            EvidencePhotoCategory::CollectionProof->value,
            EvidencePhotoCategory::ReturnProof->value,
            EvidencePhotoCategory::FailedCollection->value,
            EvidencePhotoCategory::GeneralRouteStop->value,
        ];
    }

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            ...ValidatedAttachmentRules::imageField('photo', self::MAX_KIB),
            'category' => ['required', 'string', Rule::in(self::stopCategories())],
            'visibility' => ['sometimes', 'string', Rule::enum(EvidencePhotoVisibility::class)],
            'caption' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:10000'],
            'knife_id' => ['nullable', 'uuid', Rule::exists('knives', 'id')],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            /** @var RouteStop|null $stop */
            $stop = $this->route('stop');
            if (! $stop instanceof RouteStop) {
                return;
            }

            $knifeId = $v->safe()->input('knife_id');
            if ($knifeId === null || $knifeId === '') {
                return;
            }

            $booking = $stop->booking;
            if ($booking === null) {
                $v->errors()->add('knife_id', 'A knife reference is only valid when this stop has a booking.');

                return;
            }

            /** @var Knife|null $knife */
            $knife = Knife::query()->find($knifeId);
            if ($knife === null) {
                return;
            }

            if ((string) $knife->company_id !== (string) $booking->company_id) {
                $v->errors()->add('knife_id', 'Knife must belong to the same customer as this stop’s booking.');
            }
        });
    }
}
