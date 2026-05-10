<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\ForecastScenarioType;
use App\Models\FinanceForecastScenario;
use App\Services\Finance\ForecastScenarioReportService;
use Illuminate\Database\Seeder;

/**
 * Sprint 24.2 preset scenarios — safe to re-run (updateOrCreate on preset_key).
 */
final class FinanceForecastScenarioSeeder extends Seeder
{
    public function run(): void
    {
        /** @var ForecastScenarioReportService $reports */
        $reports = app(ForecastScenarioReportService::class);

        $presets = [
            [
                'preset_key' => 'conservative',
                'name' => 'Conservative',
                'scenario_type' => ForecastScenarioType::Conservative,
                'inputs' => [
                    'route_days_per_week' => 3,
                    'stops_per_route' => 6,
                    'average_knives_per_stop' => 10,
                    'average_price_per_knife_pence' => 750,
                    'trial_volume_share' => 0.45,
                    'subscription_customers' => 4,
                    'average_subscription_price_pence' => 8900,
                    'churn_percentage_monthly' => 5,
                    'consumable_cost_per_knife_pence' => 140,
                    'petrol_per_route_pence' => 5200,
                    'marketing_spend_monthly_pence' => 25000,
                    'sales_driver_cost_monthly_pence' => 220000,
                ],
            ],
            [
                'preset_key' => 'expected',
                'name' => 'Expected',
                'scenario_type' => ForecastScenarioType::Expected,
                'inputs' => [
                    'route_days_per_week' => 4,
                    'stops_per_route' => 8,
                    'average_knives_per_stop' => 12,
                    'average_price_per_knife_pence' => 850,
                    'trial_volume_share' => 0.35,
                    'subscription_customers' => 8,
                    'average_subscription_price_pence' => 9900,
                    'churn_percentage_monthly' => 3,
                    'consumable_cost_per_knife_pence' => 120,
                    'petrol_per_route_pence' => 4500,
                    'marketing_spend_monthly_pence' => 35000,
                    'sales_driver_cost_monthly_pence' => 200000,
                ],
            ],
            [
                'preset_key' => 'aggressive',
                'name' => 'Aggressive',
                'scenario_type' => ForecastScenarioType::Aggressive,
                'inputs' => [
                    'route_days_per_week' => 5,
                    'stops_per_route' => 10,
                    'average_knives_per_stop' => 15,
                    'average_price_per_knife_pence' => 920,
                    'trial_volume_share' => 0.25,
                    'subscription_customers' => 14,
                    'average_subscription_price_pence' => 10500,
                    'churn_percentage_monthly' => 2,
                    'consumable_cost_per_knife_pence' => 110,
                    'petrol_per_route_pence' => 4200,
                    'marketing_spend_monthly_pence' => 55000,
                    'sales_driver_cost_monthly_pence' => 185000,
                ],
            ],
        ];

        foreach ($presets as $preset) {
            $merged = $reports->mergedInputs($preset['inputs']);

            FinanceForecastScenario::query()->updateOrCreate(
                ['preset_key' => $preset['preset_key']],
                [
                    'name' => $preset['name'],
                    'scenario_type' => $preset['scenario_type'],
                    'inputs' => $merged,
                    'created_by_user_id' => null,
                ],
            );
        }
    }
}
