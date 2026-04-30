<?php

namespace App\Http\Requests\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class AdminUpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'role' => ['sometimes', Rule::enum(UserRole::class)],
            'status' => ['sometimes', Rule::enum(UserStatus::class)],
            /** @phpstan-ignore-next-line */
            'company_id' => ['sometimes', 'nullable', 'uuid', 'exists:companies,id'],
            /** Confirmation string when a super admin edits their own role downward. */
            'confirm_super_demotion' => ['nullable', 'string', 'max:64'],
        ];
    }
}
