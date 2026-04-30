<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ReportKnifeIssueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'damage_notes' => ['required', 'string', 'min:2', 'max:20000'],
        ];
    }
}
