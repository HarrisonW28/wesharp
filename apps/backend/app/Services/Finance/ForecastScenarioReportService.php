<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Enums\CostStatus;
use App\Models\CostItem;
use App\Models\FinanceCashPositionSetting;
use App\Models\FinanceForecastScenario;

final class ForecastScenarioReportService
{
    public function __construct(
        private readonly ForecastScenarioCalculator $calculator,
        private readonly CostRoiPaybackService $roiPayback,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function scenarioRow(FinanceForecastScenario $scenario): array
    {
        return [
            'id' => (string) $scenario->id,
            'name' => $scenario->name,
            'scenario_type' => $scenario->scenario_type->value,
            'preset_key' => $scenario->preset_key,
            'updated_at' => $scenario->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public function fullPayload(FinanceForecastScenario $scenario): array
    {
        $catalogueFixed = $this->catalogueActiveMonthlyFixedPence();

        $cashSettings = FinanceCashPositionSetting::query()->find(1);
        $startingFallback = $cashSettings !== null ? $cashSettings->starting_capital_pence : null;

        $mergedInputs = array_merge($this->defaultInputs(), $scenario->inputs ?? []);

        $forecast = $this->calculator->compute($mergedInputs, $catalogueFixed, $startingFallback);

        $net = (int) ($forecast['outputs']['net_profit_estimate_pence'] ?? 0);
        $roiPayback = $this->roiPayback->build($net);

        return [
            'scenario' => $this->scenarioRow($scenario),
            'forecast' => $forecast,
            'roi_payback' => $roiPayback,
            'catalogue_monthly_fixed_core_pence_used' => $catalogueFixed,
            'disclaimer' => 'Forecast scenarios are planning artefacts only. They do not write to ledger tables.',
        ];
    }

    /** @return array<string, mixed> */
    public function defaultInputs(): array
    {
        return [
            'route_days_per_week' => 4,
            'stops_per_route' => 8,
            'average_knives_per_stop' => 12,
            'average_price_per_knife_pence' => 850,
            'trial_price_percentage' => 75,
            'trial_volume_share' => 0.35,
            'conversion_rate_trial_to_regular' => 0.18,
            'subscription_customers' => 8,
            'average_subscription_price_pence' => 9900,
            'churn_percentage_monthly' => 3,
            'consumable_cost_per_knife_pence' => 120,
            'petrol_per_route_pence' => 4500,
            'sales_driver_cost_monthly_pence' => 200000,
            'marketing_spend_monthly_pence' => 35000,
            'monthly_fixed_costs_override_pence' => null,
            'use_catalogue_fixed_costs' => true,
            'starting_cash_pence' => null,
            'forecast_horizon_months' => 36,
        ];
    }

    /**
     * @param  array<string, mixed>  $inputs
     * @return array<string, mixed>
     */
    public function mergedInputs(array $inputs): array
    {
        return array_merge($this->defaultInputs(), $inputs);
    }

    private function catalogueActiveMonthlyFixedPence(): int
    {
        $items = CostItem::query()
            ->where('is_recurring', true)
            ->whereNotIn('status', [
                CostStatus::Cancelled,
                CostStatus::Archived,
            ])
            ->get();

        $activeMonthly = 0;

        foreach ($items as $item) {
            if ($item->status->isActiveRecurringCommitmentBucket()) {
                $activeMonthly += (int) ($item->monthly_equivalent_pence ?? 0);
            }
        }

        return $activeMonthly;
    }
}
