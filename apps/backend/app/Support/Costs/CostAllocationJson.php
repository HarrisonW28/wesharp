<?php

declare(strict_types=1);

namespace App\Support\Costs;

use App\Models\CostAllocation;
use App\Support\Money\MoneyFormatting;

final class CostAllocationJson
{
    /** @return array<string, mixed> */
    public static function ledgerRow(CostAllocation $row): array
    {
        $row->loadMissing(['costItem', 'createdBy']);

        return [
            'id' => (string) $row->id,
            'cost_item_id' => $row->cost_item_id !== null ? (string) $row->cost_item_id : null,
            'cost_item_name' => $row->costItem?->name,
            'consumable_usage_id' => $row->consumable_usage_id !== null ? (string) $row->consumable_usage_id : null,
            'target_type' => $row->target_type->value,
            'target_id' => (string) $row->target_id,
            'amount_pence' => (int) $row->amount_pence,
            'formatted_amount' => MoneyFormatting::formatGbpFromPence((int) $row->amount_pence),
            'currency' => $row->currency,
            'allocation_method' => $row->allocation_method->value,
            'notes' => $row->notes,
            'created_at' => $row->created_at?->toIso8601String(),
            'created_by_user_id' => $row->created_by_user_id !== null ? (string) $row->created_by_user_id : null,
            'created_by_name' => $row->createdBy?->name,
        ];
    }
}
