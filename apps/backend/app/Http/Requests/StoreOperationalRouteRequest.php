<?php

namespace App\Http\Requests;

use App\Enums\OperationalRouteStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOperationalRouteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'scheduled_date' => ['required', 'date'],
            'coverage_city' => ['nullable', 'string', 'max:96'],
            'driver_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'notes' => ['nullable', 'string', 'max:20000'],
            'route_status' => ['sometimes', Rule::enum(OperationalRouteStatus::class)],
        ];
    }
}
