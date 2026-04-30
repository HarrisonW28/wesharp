<?php

namespace App\Http\Requests;

use App\Enums\OperationalRouteStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOperationalRouteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'scheduled_date' => ['sometimes', 'date'],
            'coverage_city' => ['nullable', 'string', 'max:96'],
            'driver_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'notes' => ['nullable', 'string', 'max:20000'],
            'meta' => ['nullable', 'array'],
            /** Status changes besides start/complete should be avoided — still prohibited for mass assign safety. */
            'route_status' => ['prohibited'],
        ];
    }
}
