<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRouteStopRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'actual_knife_count' => ['nullable', 'integer', 'min:0', 'max:65000'],
            'damage_notes' => ['nullable', 'string', 'max:20000'],
            'route_stop_status' => ['prohibited'],
        ];
    }
}
