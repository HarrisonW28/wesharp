<?php

declare(strict_types=1);

namespace App\Http\Requests\Invoices;

use Illuminate\Foundation\Http\FormRequest;

final class StartInvoiceStripeCheckoutSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'marketing_opt_in' => ['sometimes', 'boolean'],
        ];
    }

    public function marketingOptIn(): bool
    {
        return $this->boolean('marketing_opt_in');
    }
}
