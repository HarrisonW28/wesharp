<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\EvidencePhotoVisibility;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateEvidencePhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'visibility' => ['sometimes', 'string', Rule::enum(EvidencePhotoVisibility::class)],
            'caption' => ['sometimes', 'nullable', 'string', 'max:500'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'archived' => ['sometimes', 'boolean'],
        ];
    }
}
