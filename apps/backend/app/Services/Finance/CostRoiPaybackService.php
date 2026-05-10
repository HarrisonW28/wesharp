<?php

declare(strict_types=1);

namespace App\Services\Finance;

use App\Enums\CostFrequency;
use App\Enums\CostStatus;
use App\Models\CostItem;
use App\Support\Money\MoneyFormatting;
use Illuminate\Database\Eloquent\Builder;

/**
 * ROI / payback views over imported cost catalogue buckets (Sprint 24.2 add-on).
 */
final class CostRoiPaybackService
{
    /** @var list<string> */
    private const EQUIPMENT_SLUGS = ['equipment'];

    /** @var list<string> */
    private const STARTUP_SLUGS = ['startup_essentials', 'safety_and_uniform', 'admin_and_legal'];

    /** @var list<string> */
    private const MARKETING_SLUGS = ['marketing_and_sales'];

    /** @var list<CostStatus> */
    private const PIPELINE_STATUSES = [
        CostStatus::ToOrder,
        CostStatus::PendingQuote,
        CostStatus::Deferred,
    ];

    /**
     * @return array<string, mixed>
     */
    public function build(int $scenarioMonthlyNetProfitPence): array
    {
        $equipment = $this->bucketOneTime(self::EQUIPMENT_SLUGS);
        $startup = $this->bucketOneTime(self::STARTUP_SLUGS);
        $marketing = $this->bucketOneTime(self::MARKETING_SLUGS);
        $recurring = $this->recurringCommitments($scenarioMonthlyNetProfitPence);

        $totalPurchased = $equipment['one_time_purchased_pence'] + $startup['one_time_purchased_pence'] + $marketing['one_time_purchased_pence'];
        $totalPipeline = $equipment['one_time_pipeline_pence'] + $startup['one_time_pipeline_pence'] + $marketing['one_time_pipeline_pence'];

        $monthlyNetPositive = max($scenarioMonthlyNetProfitPence, 0);
        $paybackPortfolio = $monthlyNetPositive > 0 && $totalPurchased > 0
            ? round($totalPurchased / $monthlyNetPositive, 2)
            : null;

        $roiMultiple12 = $totalPurchased > 0 && $monthlyNetPositive > 0
            ? round(($monthlyNetPositive * 12) / $totalPurchased, 4)
            : null;

        return [
            'definitions' => [
                'equipment_startup_marketing_buckets' => 'One-time catalogue rows mapped by category slug families (equipment / startup+legal+safety / marketing). Purchased reflects cash already deployed; pipeline sums to-order, pending quote and deferred statuses.',
                'recurring_commitments' => 'Active recurring catalogue rows (active, purchased or reserve statuses) using stored monthly equivalents.',
                'simple_payback_months' => 'Purchased one-time portfolio total ÷ max(scenario monthly net profit, 0). Illustrative — uses the scenario profit line as a single pool.',
                'twelve_month_roi_multiple' => '(Scenario monthly net × 12) ÷ purchased one-time portfolio when both are positive — rough “times deployed capital”.',
                'isolated_bucket_payback' => 'Each bucket’s purchased total ÷ scenario monthly net — “months if only this bucket existed”; not additive across buckets.',
            ],
            'buckets' => [
                'equipment' => $this->enrichBucket($equipment, $scenarioMonthlyNetProfitPence),
                'startup' => $this->enrichBucket($startup, $scenarioMonthlyNetProfitPence),
                'marketing' => $this->enrichBucket($marketing, $scenarioMonthlyNetProfitPence),
                'recurring_commitments' => $recurring,
            ],
            'portfolio' => [
                'one_time_purchased_total_pence' => $totalPurchased,
                'formatted_one_time_purchased_total' => MoneyFormatting::formatGbpFromPence($totalPurchased),
                'one_time_pipeline_total_pence' => $totalPipeline,
                'formatted_one_time_pipeline_total' => MoneyFormatting::formatGbpFromPence($totalPipeline),
                'simple_payback_months' => $paybackPortfolio,
                'twelve_month_roi_multiple_vs_purchased_capex' => $roiMultiple12,
                'scenario_monthly_net_profit_pence_used' => $scenarioMonthlyNetProfitPence,
                'formatted_scenario_monthly_net_profit_used' => MoneyFormatting::formatGbpFromPence($scenarioMonthlyNetProfitPence),
            ],
        ];
    }

    /**
     * @param  list<string>  $categorySlugs
     * @return array{one_time_purchased_pence: int, one_time_pipeline_pence: int}
     */
    private function bucketOneTime(array $categorySlugs): array
    {
        $base = $this->baseCostQuery()->whereHas('category', fn (Builder $q) => $q->whereIn('slug', $categorySlugs));

        $purchased = (int) (clone $base)
            ->where('frequency', CostFrequency::OneTime)
            ->where('status', CostStatus::Purchased)
            ->sum('amount_pence');

        $pipeline = (int) (clone $base)
            ->where('frequency', CostFrequency::OneTime)
            ->whereIn('status', self::PIPELINE_STATUSES)
            ->sum('amount_pence');

        return [
            'one_time_purchased_pence' => $purchased,
            'one_time_pipeline_pence' => $pipeline,
        ];
    }

    /**
     * @param  array{one_time_purchased_pence: int, one_time_pipeline_pence: int}  $bucket
     * @return array<string, mixed>
     */
    private function enrichBucket(array $bucket, int $scenarioMonthlyNetProfitPence): array
    {
        $p = $bucket['one_time_purchased_pence'];
        $payback = $scenarioMonthlyNetProfitPence > 0 && $p > 0
            ? round($p / $scenarioMonthlyNetProfitPence, 2)
            : null;

        return [
            'one_time_purchased_pence' => $p,
            'formatted_one_time_purchased' => MoneyFormatting::formatGbpFromPence($p),
            'one_time_pipeline_pence' => $bucket['one_time_pipeline_pence'],
            'formatted_one_time_pipeline' => MoneyFormatting::formatGbpFromPence($bucket['one_time_pipeline_pence']),
            'simple_payback_months_isolated' => $payback,
            'twelve_month_roi_multiple_vs_bucket_capex' => $scenarioMonthlyNetProfitPence > 0 && $p > 0
                ? round(($scenarioMonthlyNetProfitPence * 12) / $p, 4)
                : null,
        ];
    }

    /** @return array<string, mixed> */
    private function recurringCommitments(int $scenarioMonthlyNetProfitPence): array
    {
        $items = CostItem::query()
            ->with('category:id,name,slug')
            ->where('is_recurring', true)
            ->whereNotIn('status', [CostStatus::Cancelled, CostStatus::Archived])
            ->get();

        $activeMonthly = 0;
        $pendingMonthly = 0;

        foreach ($items as $item) {
            $mp = (int) ($item->monthly_equivalent_pence ?? 0);
            $st = $item->status;
            if ($st->isActiveRecurringCommitmentBucket()) {
                $activeMonthly += $mp;
            } elseif ($st->isPendingRecurringCommitmentBucket()) {
                $pendingMonthly += $mp;
            }
        }

        $annualActive = $activeMonthly * 12;
        $profitFloor = max($scenarioMonthlyNetProfitPence, 0);

        return [
            'active_monthly_equivalent_pence' => $activeMonthly,
            'formatted_active_monthly_equivalent' => MoneyFormatting::formatGbpFromPence($activeMonthly),
            'pending_monthly_equivalent_pence' => $pendingMonthly,
            'formatted_pending_monthly_equivalent' => MoneyFormatting::formatGbpFromPence($pendingMonthly),
            'annual_active_commitment_pence' => $annualActive,
            'formatted_annual_active_commitment' => MoneyFormatting::formatGbpFromPence($annualActive),
            'months_of_flat_net_profit_to_cover_annual_recurring' => $annualActive > 0 && $profitFloor > 0
                ? round($annualActive / $profitFloor, 2)
                : null,
        ];
    }

    /** @return Builder<CostItem> */
    private function baseCostQuery(): Builder
    {
        return CostItem::query()->whereNotIn('status', [
            CostStatus::Cancelled,
            CostStatus::Archived,
        ]);
    }
}
