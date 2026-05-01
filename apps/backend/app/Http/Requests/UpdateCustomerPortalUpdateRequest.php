<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\EvidencePhotoVisibility;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateCustomerPortalUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'body' => ['sometimes', 'string', 'min:1', 'max:10000'],
            'visibility' => ['sometimes', 'string', Rule::enum(EvidencePhotoVisibility::class)],
            'archived' => ['sometimes', 'boolean'],
        ];
    }
}
