<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateServiceAreaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'city' => ['sometimes', 'required', 'string', 'max:255'],
            'region' => ['sometimes', 'nullable', 'string', 'max:255'],
            'country' => ['sometimes', 'nullable', 'string', 'max:8'],
            'postcode_prefix' => ['sometimes', 'nullable', 'string', 'max:10'],
            'centre_latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'centre_longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'radius_metres' => ['sometimes', 'nullable', 'integer', 'min:50', 'max:500000'],
            'active' => ['sometimes', 'boolean'],
        ];
    }
}
