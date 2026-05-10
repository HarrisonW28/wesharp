<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateFinanceCashPositionAssumptionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'starting_capital_pence' => ['nullable', 'integer', 'min:0'],
            'regular_route_price_per_knife_pence' => ['nullable', 'integer', 'min:0'],
            'trial_price_per_knife_pence' => ['nullable', 'integer', 'min:0'],
            'route_days_per_week' => ['nullable', 'numeric', 'min:0', 'max:7'],
            'buffer_warning_threshold_pence' => ['nullable', 'integer', 'min:0'],
            'conversion_target_price_pence' => ['nullable', 'integer', 'min:0'],
            'second_machine_trigger_pence' => ['nullable', 'integer', 'min:0'],
            'van_assessment_trigger_pence' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
