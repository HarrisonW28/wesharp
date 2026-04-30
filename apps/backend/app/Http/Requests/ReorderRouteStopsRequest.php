<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReorderRouteStopsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'stop_ids' => ['required', 'array', 'min:1'],
            'stop_ids.*' => ['required', 'uuid'],
        ];
    }
}
