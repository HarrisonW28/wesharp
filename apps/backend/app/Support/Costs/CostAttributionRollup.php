<?php

declare(strict_types=1);

namespace App\Support\Costs;

use App\Data\Reports\AdminReportFilters;
use App\Enums\CostAllocationTargetType;
use App\Enums\CostStatus;
use App\Models\Booking;
use App\Models\CompanySubscription;
use App\Models\ConsumableUsage;
use App\Models\CostAllocation;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\RouteStop;
use Illuminate\Database\Eloquent\Builder;

/**
 * Roll-ups for Sprint 23.5 — attributing manual allocations and consumable usage cost to companies / reporting periods.
 */
final class CostAttributionRollup
{
    /** Apply filters so allocations roll up to the given company (targets plus indirect routes via bookings/subscriptions/invoices). */
    public static function scopeAllocationsForCompany(Builder $query, string $companyId): Builder
    {
        return $query->where(function (Builder $outer) use ($companyId): void {
            $outer->where(function (Builder $q) use ($companyId): void {
                $q->where('target_type', CostAllocationTargetType::Company)
                    ->where('target_id', $companyId);
            })->orWhere(function (Builder $q) use ($companyId): void {
                $q->where('target_type', CostAllocationTargetType::Order)
                    ->whereIn('target_id', Order::query()->where('company_id', $companyId)->select('id'));
            })->orWhere(function (Builder $q) use ($companyId): void {
                $q->where('target_type', CostAllocationTargetType::Invoice)
                    ->whereIn('target_id', Invoice::query()->where('company_id', $companyId)->select('id'));
            })->orWhere(function (Builder $q) use ($companyId): void {
                $q->where('target_type', CostAllocationTargetType::Subscription)
                    ->whereIn('target_id', CompanySubscription::query()->where('company_id', $companyId)->select('id'));
            })->orWhere(function (Builder $q) use ($companyId): void {
                $q->where('target_type', CostAllocationTargetType::Booking)
                    ->whereIn('target_id', Booking::query()->where('company_id', $companyId)->select('id'));
            })->orWhere(function (Builder $q) use ($companyId): void {
                $q->where('target_type', CostAllocationTargetType::RouteStop)
                    ->whereIn(
                        'target_id',
                        RouteStop::query()
                            ->whereHas('booking', fn ($bq) => $bq->where('company_id', $companyId))
                            ->select('id'),
                    );
            });
        });
    }

    public static function sumManualAllocationsForCompany(string $companyId): int
    {
        return (int) CostAllocation::query()
            ->tap(fn (Builder $q) => self::scopeAllocationsForCompany($q, $companyId))
            ->where(function (Builder $outer): void {
                $outer
                    ->where(function (Builder $q): void {
                        $q->whereNull('cost_item_id')
                            ->orWhereHas('costItem', fn ($ci) => $ci->where('status', '!=', CostStatus::Archived));
                    })
                    ->where(function (Builder $q): void {
                        $q->whereNull('consumable_usage_id')
                            ->orWhereHas('consumableUsage.consumable.costItem', fn ($ci) => $ci->where('status', '!=', CostStatus::Archived));
                    });
            })
            ->sum('amount_pence');
    }

    /** Consumable usage cost attributed via linked orders for one company (lifetime). */
    public static function sumConsumableUsageCostForCompany(string $companyId): int
    {
        $usages = ConsumableUsage::query()
            ->whereHas('order', fn ($oq) => $oq->where('company_id', $companyId))
            ->whereHas('consumable.costItem', fn ($ci) => $ci->where('status', '!=', CostStatus::Archived))
            ->with(['consumable.costItem'])
            ->get();

        return (int) $usages->sum(fn (ConsumableUsage $u): int => self::consumableUsageRowCostPence($u));
    }

    public static function consumableUsageRowCostPence(ConsumableUsage $usage): int
    {
        $consumable = $usage->relationLoaded('consumable') ? $usage->consumable : $usage->consumable()->with('costItem')->first();
        if ($consumable === null || $consumable->costItem === null) {
            return 0;
        }

        $cpu = ConsumableMetrics::costPerUsePence($consumable);
        $qty = (float) $usage->quantity_used;

        if ($cpu !== null) {
            return (int) round($qty * $cpu);
        }

        return (int) round($qty * (int) $consumable->costItem->amount_pence);
    }

    /** @return array{manual_pence: int, consumable_pence: int} */
    public static function periodTotals(AdminReportFilters $f): array
    {
        $from = $f->from->copy()->utc()->startOfDay();
        $to = $f->to->copy()->utc()->endOfDay();

        $manualQuery = CostAllocation::query()
            ->whereBetween('created_at', [$from, $to])
            ->where(function (Builder $outer): void {
                $outer
                    ->where(function (Builder $q): void {
                        $q->whereNull('cost_item_id')
                            ->orWhereHas('costItem', fn ($ci) => $ci->where('status', '!=', CostStatus::Archived));
                    })
                    ->where(function (Builder $q): void {
                        $q->whereNull('consumable_usage_id')
                            ->orWhereHas('consumableUsage.consumable.costItem', fn ($ci) => $ci->where('status', '!=', CostStatus::Archived));
                    });
            });
        if ($f->companyId !== null && $f->companyId !== '') {
            self::scopeAllocationsForCompany($manualQuery, $f->companyId);
        }

        $manualPence = (int) $manualQuery->sum('amount_pence');

        $usageQuery = ConsumableUsage::query()
            ->whereBetween('usage_date', [
                $f->from->toDateString(),
                $f->to->toDateString(),
            ])
            ->whereHas('consumable.costItem', fn ($ci) => $ci->where('status', '!=', CostStatus::Archived));
        if ($f->companyId !== null && $f->companyId !== '') {
            $usageQuery->whereHas('order', fn ($oq) => $oq->where('company_id', $f->companyId));
        }

        $usages = $usageQuery->with(['consumable.costItem'])->get();
        $consumablePence = (int) $usages->sum(fn (ConsumableUsage $u): int => self::consumableUsageRowCostPence($u));

        return [
            'manual_pence' => $manualPence,
            'consumable_pence' => $consumablePence,
        ];
    }
}
