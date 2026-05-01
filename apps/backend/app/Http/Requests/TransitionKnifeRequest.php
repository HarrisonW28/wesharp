<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\KnifeStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class TransitionKnifeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'target_status' => ['required', Rule::enum(KnifeStatus::class)],
            'note' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
