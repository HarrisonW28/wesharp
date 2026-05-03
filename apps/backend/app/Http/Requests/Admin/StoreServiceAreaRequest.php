<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

final class StoreServiceAreaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'region' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:8'],
            'postcode_prefix' => ['nullable', 'string', 'max:10'],
            'centre_latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'centre_longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'radius_metres' => ['nullable', 'integer', 'min:50', 'max:500000'],
            'active' => ['sometimes', 'boolean'],
        ];
    }
}
