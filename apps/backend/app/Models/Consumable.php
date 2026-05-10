<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ConsumableInventoryStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Consumable extends Model
{
    use HasUuids;

    protected $fillable = [
        'cost_item_id',
        'stock_quantity',
        'stock_unit',
        'reorder_threshold',
        'reorder_note',
        'last_reorder_date',
        'estimated_uses_per_unit',
        'cost_per_knife_estimate_pence',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'stock_quantity' => 'decimal:3',
            'reorder_threshold' => 'decimal:3',
            'last_reorder_date' => 'date',
            'estimated_uses_per_unit' => 'decimal:2',
            'cost_per_knife_estimate_pence' => 'integer',
            'status' => ConsumableInventoryStatus::class,
        ];
    }

    public function costItem(): BelongsTo
    {
        return $this->belongsTo(CostItem::class, 'cost_item_id');
    }

    public function usages(): HasMany
    {
        return $this->hasMany(ConsumableUsage::class, 'consumable_id');
    }
}
