<?php

declare(strict_types=1);

namespace App\Support\Costs;

use App\Models\Consumable;

final class ConsumableMetrics
{
    public static function isLowStock(Consumable $consumable): bool
    {
        $threshold = $consumable->reorder_threshold;
        if ($threshold === null || (float) $threshold <= 0) {
            return false;
        }

        return (float) $consumable->stock_quantity <= (float) $threshold;
    }

    /** Whole-unit shortfall to reach reorder threshold (minimum restock suggestion). */
    public static function restockQuantity(Consumable $consumable): float
    {
        $threshold = $consumable->reorder_threshold;
        if ($threshold === null || (float) $threshold <= 0) {
            return 0.0;
        }

        $stock = (float) $consumable->stock_quantity;
        $th = (float) $threshold;
        if ($stock >= $th) {
            return 0.0;
        }

        return $th - $stock;
    }

    public static function projectedReorderCostPence(Consumable $consumable): int
    {
        $units = self::restockQuantity($consumable);
        if ($units <= 0) {
            return 0;
        }

        $costItem = $consumable->costItem;
        if ($costItem === null) {
            return 0;
        }

        return (int) round($units * (int) $costItem->amount_pence);
    }

    public static function costPerUsePence(Consumable $consumable): ?int
    {
        $uses = $consumable->estimated_uses_per_unit;
        if ($uses === null || (float) $uses <= 0) {
            return null;
        }

        $costItem = $consumable->costItem;
        if ($costItem === null) {
            return null;
        }

        return (int) round((int) $costItem->amount_pence / (float) $uses);
    }
}
