<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\EvidencePhotoCategory;
use App\Enums\EvidencePhotoVisibility;
use App\Support\Http\ValidatedAttachmentRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreDamageReportEvidencePhotoRequest extends FormRequest
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
        ];
    }
}
