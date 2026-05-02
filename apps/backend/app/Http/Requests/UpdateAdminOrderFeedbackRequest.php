<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateAdminOrderFeedbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'staff_reviewed' => ['sometimes', 'boolean'],
            'testimonial_marketing_approved' => ['sometimes', 'boolean'],
        ];
    }
}
