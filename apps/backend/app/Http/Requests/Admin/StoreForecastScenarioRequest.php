<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\ForecastScenarioType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreForecastScenarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return array_merge([
            'name' => ['required', 'string', 'max:160'],
            'scenario_type' => ['required', 'string', Rule::enum(ForecastScenarioType::class)],
            'inputs' => ['nullable', 'array'],
        ], ForecastScenarioInputsRules::rules());
    }
}
