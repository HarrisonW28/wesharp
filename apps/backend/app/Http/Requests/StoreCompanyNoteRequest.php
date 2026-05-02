<?php

namespace App\Http\Requests;

use App\Enums\NoteVisibility;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCompanyNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('visibility') || $this->input('visibility') === null || $this->input('visibility') === '') {
            $this->merge(['visibility' => NoteVisibility::Internal->value]);
        }
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:20000'],
            'visibility' => ['required', Rule::enum(NoteVisibility::class)],
        ];
    }
}
