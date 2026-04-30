<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AttachKnifeToOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'knife_id' => ['required', 'uuid', 'exists:knives,id'],
        ];
    }
}
