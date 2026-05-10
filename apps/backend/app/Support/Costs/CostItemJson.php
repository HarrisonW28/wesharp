<?php

declare(strict_types=1);

namespace App\Support\Costs;

use App\Models\CostCategory;
use App\Models\CostItem;
use App\Support\Money\MoneyFormatting;

final class CostItemJson
{
    /** @return array<string, mixed> */
    public static function categorySummary(CostCategory $category): array
    {
        return [
            'id' => (string) $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description,
            'display_order' => (int) $category->display_order,
            'is_active' => (bool) $category->is_active,
        ];
    }

    /** @return array<string, mixed> */
    public static function detail(CostItem $item): array
    {
        $row = [
            'id' => (string) $item->id,
            'category_id' => (string) $item->category_id,
            'tier_label' => $item->tier_label,
            'name' => $item->name,
            'description' => $item->description,
            'amount_pence' => (int) $item->amount_pence,
            'formatted_amount' => MoneyFormatting::formatGbpFromPence((int) $item->amount_pence),
            'currency' => $item->currency,
            'frequency' => $item->frequency->value,
            'frequency_label' => self::frequencyLabel($item->frequency->value),
            'status' => $item->status->value,
            'status_label' => self::statusLabel($item->status->value),
            'supplier_name' => $item->supplier_name,
            'supplier_url' => $item->supplier_url,
            'priority' => (int) $item->priority,
            'notes' => $item->notes,
            'is_recurring' => (bool) $item->is_recurring,
            'is_consumable' => (bool) $item->is_consumable,
            'is_seeded' => (bool) $item->is_seeded,
            'source' => $item->source,
            'source_sheet' => $item->source_sheet,
            'source_row' => $item->source_row,
            'seed_key' => $item->seed_key,
            'starts_on' => $item->starts_on?->toDateString(),
            'ends_on' => $item->ends_on?->toDateString(),
            'next_due_on' => $item->next_due_on?->toDateString(),
            'renews_on' => $item->renews_on?->toDateString(),
            'commitment_cancellable' => (bool) $item->commitment_cancellable,
            'payment_method_note' => $item->payment_method_note,
            'monthly_equivalent_pence' => $item->monthly_equivalent_pence,
            'annual_equivalent_pence' => $item->annual_equivalent_pence,
            'formatted_monthly_equivalent' => $item->monthly_equivalent_pence !== null
                ? MoneyFormatting::formatGbpFromPence((int) $item->monthly_equivalent_pence)
                : null,
            'formatted_annual_equivalent' => $item->annual_equivalent_pence !== null
                ? MoneyFormatting::formatGbpFromPence((int) $item->annual_equivalent_pence)
                : null,
            'created_at' => $item->created_at?->toIso8601String(),
            'updated_at' => $item->updated_at?->toIso8601String(),
            'category' => null,
        ];

        if ($item->relationLoaded('category') && $item->category !== null) {
            $row['category'] = self::categorySummary($item->category);
        }

        return $row;
    }

    private static function frequencyLabel(string $value): string
    {
        return match ($value) {
            'one_time' => 'One-time',
            'weekly' => 'Weekly',
            'monthly' => 'Monthly',
            'quarterly' => 'Quarterly',
            'annual' => 'Annual',
            'per_route' => 'Per route',
            'per_order' => 'Per order',
            'per_knife' => 'Per knife',
            'usage_based' => 'Usage-based',
            default => $value,
        };
    }

    private static function statusLabel(string $value): string
    {
        return match ($value) {
            'purchased' => 'Purchased',
            'to_order' => 'To order',
            'pending_quote' => 'Pending quote',
            'deferred' => 'Deferred',
            'active' => 'Active',
            'to_arrange' => 'To arrange',
            'reserve' => 'Reserve',
            'to_research' => 'To research',
            'cancelled' => 'Cancelled',
            'archived' => 'Archived',
            default => $value,
        };
    }
}
