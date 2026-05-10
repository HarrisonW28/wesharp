<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

final class ForecastScenarioInputsRules
{
    /** @return array<string, mixed> */
    public static function rules(string $prefix = 'inputs'): array
    {
        $p = $prefix !== '' ? $prefix.'.' : '';

        return [
            $p.'route_days_per_week' => ['sometimes', 'nullable', 'numeric', 'between:0,7'],
            $p.'stops_per_route' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:500'],
            $p.'average_knives_per_stop' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:5000'],
            $p.'average_price_per_knife_pence' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:5000000'],
            $p.'trial_price_percentage' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:200'],
            $p.'trial_volume_share' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:1'],
            $p.'conversion_rate_trial_to_regular' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:1'],
            $p.'subscription_customers' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100000'],
            $p.'average_subscription_price_pence' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:50000000'],
            $p.'churn_percentage_monthly' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            $p.'consumable_cost_per_knife_pence' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:500000'],
            $p.'petrol_per_route_pence' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:50000000'],
            $p.'sales_driver_cost_monthly_pence' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:500000000'],
            $p.'marketing_spend_monthly_pence' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:500000000'],
            $p.'monthly_fixed_costs_override_pence' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:500000000'],
            $p.'use_catalogue_fixed_costs' => ['sometimes', 'nullable', 'boolean'],
            $p.'starting_cash_pence' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:500000000000'],
            $p.'forecast_horizon_months' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:120'],
        ];
    }
}
