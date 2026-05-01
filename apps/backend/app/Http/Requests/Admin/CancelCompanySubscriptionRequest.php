<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

final class CancelCompanySubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'cancellation_notes' => ['sometimes', 'nullable', 'string', 'max:8000'],
            'cancelled_at' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
