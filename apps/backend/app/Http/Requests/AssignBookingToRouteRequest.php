<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssignBookingToRouteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'route_id' => ['required', 'uuid', 'exists:routes,id'],
            'sequence' => ['nullable', 'integer', 'min:1', 'max:50000'],
        ];
    }
}
