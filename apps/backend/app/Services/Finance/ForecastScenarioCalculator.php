<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Support\Money\MoneyFormatting;

/**
 * Sprint 24.2 estimate engine — deterministic, workbook-style maths (not ML).
 *
 * @phpstan-type ForecastInputs array{
 *   route_days_per_week?: float|int,
 *   stops_per_route?: float|int,
 *   average_knives_per_stop?: float|int,
 *   average_price_per_knife_pence?: int,
 *   trial_price_percentage?: float|int,
 *   trial_volume_share?: float,
 *   subscription_customers?: int,
 *   average_subscription_price_pence?: int,
 *   churn_percentage_monthly?: float|int,
 *   consumable_cost_per_knife_pence?: int,
 *   petrol_per_route_pence?: int,
 *   sales_driver_cost_monthly_pence?: int,
 *   marketing_spend_monthly_pence?: int,
 *   monthly_fixed_costs_override_pence?: int|null,
 *   use_catalogue_fixed_costs?: bool,
 *   starting_cash_pence?: int|null,
 *   forecast_horizon_months?: int,
 * }
 */
final class ForecastScenarioCalculator
{
    private const WEEKS_PER_YEAR = 52;

    /**
     * @param  ForecastInputs  $inputs
     * @return array<string, mixed>
     */
    public function compute(array $inputs, int $catalogueMonthlyFixedPence, ?int $startingCashFallbackPence): array
    {
        $routeDays = (float) ($inputs['route_days_per_week'] ?? 4);
        $stops = (float) ($inputs['stops_per_route'] ?? 8);
        $knivesPerStop = (float) ($inputs['average_knives_per_stop'] ?? 12);
        $price = (int) ($inputs['average_price_per_knife_pence'] ?? 850);
        $trialPct = (float) ($inputs['trial_price_percentage'] ?? 75);
        $trialShare = (float) ($inputs['trial_volume_share'] ?? 0.35);
        $trialShare = max(0.0, min(1.0, $trialShare));
        $trialMultiplier = max(0.0, $trialPct / 100.0);
        $blendedPricePerKnife = (int) round($price * ((1 - $trialShare) + $trialShare * $trialMultiplier));

        $knivesPerWeek = $routeDays * $stops * $knivesPerStop;
        $weeklyServiceRevenuePence = (int) round($knivesPerWeek * $blendedPricePerKnife);
        $monthlyServiceRevenuePence = (int) round($weeklyServiceRevenuePence * self::WEEKS_PER_YEAR / 12);

        $subCustomers = (int) ($inputs['subscription_customers'] ?? 0);
        $subPrice = (int) ($inputs['average_subscription_price_pence'] ?? 0);
        $churn = (float) ($inputs['churn_percentage_monthly'] ?? 0);
        $churn = max(0.0, min(100.0, $churn));
        $subscriptionMrrPence = (int) round($subCustomers * $subPrice * (1 - $churn / 100.0));

        $monthlyRevenueTotalPence = $monthlyServiceRevenuePence + $subscriptionMrrPence;

        $consumablePerKnife = (int) ($inputs['consumable_cost_per_knife_pence'] ?? 0);
        $knivesPerMonth = $knivesPerWeek * self::WEEKS_PER_YEAR / 12;
        $consumableMonthlyPence = (int) round($knivesPerMonth * $consumablePerKnife);

        $petrolPerRoute = (int) ($inputs['petrol_per_route_pence'] ?? 0);
        $routeInstancesPerMonth = $routeDays * self::WEEKS_PER_YEAR / 12;
        $petrolMonthlyPence = (int) round($routeInstancesPerMonth * $petrolPerRoute);

        $marketing = (int) ($inputs['marketing_spend_monthly_pence'] ?? 0);
        $salesDriver = (int) ($inputs['sales_driver_cost_monthly_pence'] ?? 0);

        $useCatalogue = (bool) ($inputs['use_catalogue_fixed_costs'] ?? true);
        /** @var int|null $override */
        $override = $inputs['monthly_fixed_costs_override_pence'] ?? null;
        $fixedCore = $useCatalogue ? $catalogueMonthlyFixedPence : (int) ($override ?? 0);
        $monthlyFixedOperatingPence = $fixedCore + $marketing + $salesDriver;

        $monthlyVariableCostsPence = $consumableMonthlyPence + $petrolMonthlyPence;
        $monthlyCostsTotalPence = $monthlyVariableCostsPence + $monthlyFixedOperatingPence;

        $grossProfitPence = $monthlyRevenueTotalPence - $monthlyVariableCostsPence;
        $netProfitMonthlyPence = $monthlyRevenueTotalPence - $monthlyCostsTotalPence;

        $weeklyRevenuePence = (int) round($monthlyRevenueTotalPence * 12 / self::WEEKS_PER_YEAR);

        $contribPerKnife = $blendedPricePerKnife - $consumablePerKnife;
        $numerator = $monthlyFixedOperatingPence + $petrolMonthlyPence - $subscriptionMrrPence;
        $knivesMonthlyBreakeven = null;
        if ($contribPerKnife > 0) {
            $knivesMonthlyBreakeven = $numerator <= 0 ? 0 : (int) ceil($numerator / $contribPerKnife);
        }

        $routeDaysPerWeekBreakeven = null;
        if ($knivesMonthlyBreakeven !== null && $stops > 0 && $knivesPerStop > 0) {
            $knivesWeeklyBreakeven = $knivesMonthlyBreakeven * 12 / self::WEEKS_PER_YEAR;
            $den = $stops * $knivesPerStop;
            if ($den > 0) {
                $routeDaysPerWeekBreakeven = round($knivesWeeklyBreakeven / $den, 3);
            }
        }

        /** @var int|null $startInput */
        $startInput = $inputs['starting_cash_pence'] ?? null;
        $startingCash = $startInput ?? $startingCashFallbackPence ?? 0;

        $horizon = (int) ($inputs['forecast_horizon_months'] ?? 36);
        $horizon = max(1, min(120, $horizon));

        $sim = $this->simulateCashTrajectory($startingCash, $netProfitMonthlyPence, $horizon);

        $runwayMonths = null;
        if ($netProfitMonthlyPence < 0 && $startingCash > 0) {
            $runwayMonths = round($startingCash / abs($netProfitMonthlyPence), 2);
        }

        return [
            'definitions' => [
                'forecast_nature' => 'All figures are illustrative projections from scenario inputs plus optional live catalogue fixed costs. They do not modify invoices, payments or cost ledger rows.',
                'trial_volume_share' => 'Approximate share of serviced knives billed at the trial tariff blend (0–1). Adjust to reflect onboarding mix.',
                'trial_price_percentage' => 'Trial unit price as a percentage of the regular average price per knife.',
                'weekly_revenue' => 'Routes × stops × knives × blended average price per knife, scaled to a week, plus subscription MRR spread evenly.',
                'monthly_recurring_revenue' => 'Subscription customers × average subscription price × (1 − monthly churn), excluding per-stop blade revenue.',
                'monthly_costs' => 'Consumables (per knife), petrol (per route day instance), catalogue or override fixed core, marketing and sales/driver allowances.',
                'net_profit_estimate' => 'Monthly revenue minus monthly variable and fixed components listed above.',
                'break_even_month' => 'First horizon month where cumulative net profit reaches zero from a standing start (cash trajectory uses the same monthly net).',
                'knives_needed_to_break_even' => 'Monthly knife volume required so knife contribution covers operating fixed plus petrol minus subscription MRR, holding prices/costs constant.',
                'routes_needed_to_break_even' => 'Implied route-days per week at current stops/knives-per-stop mix to achieve knife breakeven volume.',
                'runway' => 'Starting cash divided by monthly cash burn when net profit is negative.',
            ],
            'inputs_resolved' => array_merge($inputs, [
                '_computed_blended_price_per_knife_pence' => $blendedPricePerKnife,
                '_computed_knives_per_week' => round($knivesPerWeek, 4),
            ]),
            'outputs' => [
                'weekly_revenue_pence' => $weeklyRevenuePence,
                'formatted_weekly_revenue' => MoneyFormatting::formatGbpFromPence($weeklyRevenuePence),
                'monthly_revenue_pence' => $monthlyRevenueTotalPence,
                'formatted_monthly_revenue' => MoneyFormatting::formatGbpFromPence($monthlyRevenueTotalPence),
                'monthly_service_revenue_pence' => $monthlyServiceRevenuePence,
                'formatted_monthly_service_revenue' => MoneyFormatting::formatGbpFromPence($monthlyServiceRevenuePence),
                'monthly_recurring_revenue_pence' => $subscriptionMrrPence,
                'formatted_monthly_recurring_revenue' => MoneyFormatting::formatGbpFromPence($subscriptionMrrPence),
                'gross_profit_pence' => $grossProfitPence,
                'formatted_gross_profit' => MoneyFormatting::formatGbpFromPence($grossProfitPence),
                'net_profit_estimate_pence' => $netProfitMonthlyPence,
                'formatted_net_profit_estimate' => MoneyFormatting::formatGbpFromPence($netProfitMonthlyPence),
                'monthly_costs_pence' => $monthlyCostsTotalPence,
                'formatted_monthly_costs' => MoneyFormatting::formatGbpFromPence($monthlyCostsTotalPence),
                'monthly_variable_costs_pence' => $monthlyVariableCostsPence,
                'monthly_fixed_costs_core_pence' => $fixedCore,
                'formatted_monthly_fixed_costs_core' => MoneyFormatting::formatGbpFromPence($fixedCore),
                'marketing_spend_monthly_pence' => $marketing,
                'sales_driver_cost_monthly_pence' => $salesDriver,
                'break_even_month_number' => $sim['break_even_month_number'],
                'cash_low_point_pence' => $sim['cash_low_point_pence'],
                'formatted_cash_low_point' => MoneyFormatting::formatGbpFromPence($sim['cash_low_point_pence']),
                'runway_months' => $runwayMonths,
                'knives_needed_to_break_even_monthly' => $knivesMonthlyBreakeven,
                'route_days_per_week_needed_to_break_even' => $routeDaysPerWeekBreakeven,
                'forecast_horizon_months' => $horizon,
                'starting_cash_pence_used' => $startingCash,
                'formatted_starting_cash_used' => MoneyFormatting::formatGbpFromPence($startingCash),
            ],
        ];
    }

    /**
     * @return array{break_even_month_number: int|null, cash_low_point_pence: int}
     */
    private function simulateCashTrajectory(int $startingCashPence, int $netMonthlyPence, int $horizonMonths): array
    {
        $cash = $startingCashPence;
        $minCash = $cash;
        $cumProfit = 0;
        $breakEvenMonth = null;

        for ($m = 1; $m <= $horizonMonths; $m++) {
            $cash += $netMonthlyPence;
            $cumProfit += $netMonthlyPence;
            $minCash = min($minCash, $cash);
            if ($cumProfit >= 0 && $breakEvenMonth === null) {
                $breakEvenMonth = $m;
            }
        }

        return [
            'break_even_month_number' => $breakEvenMonth,
            'cash_low_point_pence' => $minCash,
        ];
    }
}
