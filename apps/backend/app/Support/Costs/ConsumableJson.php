<?php

declare(strict_types=1);

namespace App\Support\Costs;

use App\Models\Consumable;
use App\Support\Money\MoneyFormatting;

final class ConsumableJson
{
    /** @return array<string, mixed> */
    public static function detail(Consumable $consumable): array
    {
        $consumable->loadMissing('costItem.category');

        $item = $consumable->costItem;
        $unitPence = $item !== null ? (int) $item->amount_pence : 0;

        $costPerUse = ConsumableMetrics::costPerUsePence($consumable);
        $low = ConsumableMetrics::isLowStock($consumable);
        $restockQty = ConsumableMetrics::restockQuantity($consumable);
        $restockPence = ConsumableMetrics::projectedReorderCostPence($consumable);

        return [
            'id' => (string) $consumable->id,
            'cost_item_id' => (string) $consumable->cost_item_id,
            'name' => $item?->name,
            'category_slug' => $item?->category?->slug,
            'unit_cost_pence' => $unitPence,
            'formatted_unit_cost' => MoneyFormatting::formatGbpFromPence($unitPence),
            'stock_quantity' => (string) $consumable->stock_quantity,
            'stock_unit' => $consumable->stock_unit,
            'reorder_threshold' => $consumable->reorder_threshold !== null ? (string) $consumable->reorder_threshold : null,
            'reorder_note' => $consumable->reorder_note,
            'last_reorder_date' => $consumable->last_reorder_date?->toDateString(),
            'estimated_uses_per_unit' => $consumable->estimated_uses_per_unit !== null ? (string) $consumable->estimated_uses_per_unit : null,
            'cost_per_use_pence' => $costPerUse,
            'formatted_cost_per_use' => $costPerUse !== null ? MoneyFormatting::formatGbpFromPence($costPerUse) : null,
            'cost_per_knife_estimate_pence' => $consumable->cost_per_knife_estimate_pence,
            'formatted_cost_per_knife_estimate' => $consumable->cost_per_knife_estimate_pence !== null
                ? MoneyFormatting::formatGbpFromPence((int) $consumable->cost_per_knife_estimate_pence)
                : null,
            'status' => $consumable->status->value,
            'notes' => $item?->notes,
            'supplier_name' => $item?->supplier_name,
            'is_low_stock' => $low,
            'restock_quantity' => $restockQty,
            'projected_reorder_cost_pence' => $restockPence,
            'formatted_projected_reorder_cost' => MoneyFormatting::formatGbpFromPence($restockPence),
        ];
    }
}
