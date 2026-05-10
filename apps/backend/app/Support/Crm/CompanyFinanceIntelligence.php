<?php

declare(strict_types=1);

namespace App\Support\Crm;

use App\Enums\CompanyStatus;
use App\Enums\InvoiceStatus;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use App\Support\Costs\CostAttributionRollup;
use App\Support\Money\MoneyFormatting;
use App\Support\Permissions;

/**
 * CRM finance snapshot (Sprint 23.5) — internal-only when viewer has {@see Permissions::COSTS_VIEW}.
 */
final class CompanyFinanceIntelligence
{
    /** @return array<string, mixed>|null */
    public static function forCompany(Company $company, User $viewer): ?array
    {
        if (! Permissions::userMay($viewer, Permissions::COSTS_VIEW)) {
            return null;
        }

        $cid = (string) $company->id;

        $totalInvoicedPence = (int) Invoice::query()
            ->where('company_id', $company->id)
            ->whereNotIn('invoice_status', [InvoiceStatus::Draft, InvoiceStatus::Void])
            ->sum('total_pence');

        $totalPaidPence = (int) Payment::query()->where('company_id', $company->id)->sum('amount_pence');

        $outstandingBalancePence = (int) $company->invoices()->outstanding()->sum('total_pence');

        $manualAllocationPence = CostAttributionRollup::sumManualAllocationsForCompany($cid);
        $consumableUsageCostPence = CostAttributionRollup::sumConsumableUsageCostForCompany($cid);

        $estimatedCostToServePence = $manualAllocationPence + $consumableUsageCostPence;
        $grossMarginEstimatePence = $totalPaidPence - $estimatedCostToServePence;

        $grossMarginPercent = null;
        if ($totalPaidPence > 0) {
            $grossMarginPercent = round(($grossMarginEstimatePence / $totalPaidPence) * 100, 1);
        }

        $company->loadMissing('operationalSubscription');
        $hasActiveSubscription = $company->operationalSubscription !== null;

        $ordersCount = $company->orders()->count();

        $labels = self::profitabilityLabels(
            $company,
            $totalPaidPence,
            $grossMarginPercent,
            $hasActiveSubscription,
            $ordersCount,
            $outstandingBalancePence,
        );

        return [
            'definitions' => [
                'estimated_cost_to_serve' => 'Sum of manual cost allocations attributed to this account plus estimated consumable cost from usage logged against its orders.',
                'gross_margin_estimate' => 'Recorded payments minus estimated cost to serve — illustrative cash-margin snapshot, not statutory accounts.',
                'manual_allocation' => 'Ledger rows created under Sprint 23.5 targeting this company, its orders, invoices, bookings, subscriptions, or stops tied to its bookings.',
            ],
            'total_invoiced_pence' => $totalInvoicedPence,
            'formatted_total_invoiced' => MoneyFormatting::formatGbpFromPence($totalInvoicedPence),
            'total_paid_pence' => $totalPaidPence,
            'formatted_total_paid' => MoneyFormatting::formatGbpFromPence($totalPaidPence),
            'outstanding_balance_pence' => $outstandingBalancePence,
            'formatted_outstanding_balance' => MoneyFormatting::formatGbpFromPence($outstandingBalancePence),
            'manual_allocation_pence' => $manualAllocationPence,
            'formatted_manual_allocation' => MoneyFormatting::formatGbpFromPence($manualAllocationPence),
            'consumable_usage_cost_pence' => $consumableUsageCostPence,
            'formatted_consumable_usage_cost' => MoneyFormatting::formatGbpFromPence($consumableUsageCostPence),
            'estimated_cost_to_serve_pence' => $estimatedCostToServePence,
            'formatted_estimated_cost_to_serve' => MoneyFormatting::formatGbpFromPence($estimatedCostToServePence),
            'gross_margin_estimate_pence' => $grossMarginEstimatePence,
            'formatted_gross_margin_estimate' => MoneyFormatting::formatGbpFromPence($grossMarginEstimatePence),
            'gross_margin_percent' => $grossMarginPercent,
            'has_active_subscription' => $hasActiveSubscription,
            'profitability_labels' => $labels,
        ];
    }

    /**
     * @return list<string>
     */
    private static function profitabilityLabels(
        Company $company,
        int $totalPaidPence,
        ?float $grossMarginPercent,
        bool $hasActiveSubscription,
        int $ordersCount,
        int $outstandingBalancePence,
    ): array {
        $labels = [];

        if ($hasActiveSubscription) {
            $labels[] = 'Subscription customer';
        }

        if ($totalPaidPence >= 500_000) {
            $labels[] = 'High value';
        }

        if ($grossMarginPercent !== null && $grossMarginPercent < 25 && $totalPaidPence > 0) {
            $labels[] = 'Low margin';
        }

        if ($ordersCount >= 15) {
            $labels[] = 'High usage';
        }

        if ($outstandingBalancePence > 0) {
            $labels[] = 'Outstanding balance';
        }

        $status = $company->company_status;
        if ($status === CompanyStatus::AtRisk) {
            $labels[] = 'At risk';
        }

        return array_values(array_unique($labels));
    }
}
