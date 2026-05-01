<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

final class GenerateSubscriptionInvoiceDraftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'billing_period_start' => ['sometimes', 'nullable', 'date'],
            'billing_period_end' => ['sometimes', 'nullable', 'date', 'after_or_equal:billing_period_start'],
            'issue_date' => ['sometimes', 'nullable', 'date'],
            'due_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:issue_date'],
        ];
    }
}
