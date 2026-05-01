<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\OrderStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class TransitionOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'target_status' => ['required', Rule::in([OrderStatus::Active->value, OrderStatus::Cancelled->value])],
            'reason' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
