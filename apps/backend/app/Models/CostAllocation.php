<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CostAllocationMethod;
use App\Enums\CostAllocationTargetType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CostAllocation extends Model
{
    use HasUuids;

    protected $fillable = [
        'cost_item_id',
        'consumable_usage_id',
        'target_type',
        'target_id',
        'amount_pence',
        'currency',
        'allocation_method',
        'notes',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'target_type' => CostAllocationTargetType::class,
            'allocation_method' => CostAllocationMethod::class,
            'amount_pence' => 'integer',
        ];
    }

    public function costItem(): BelongsTo
    {
        return $this->belongsTo(CostItem::class, 'cost_item_id');
    }

    public function consumableUsage(): BelongsTo
    {
        return $this->belongsTo(ConsumableUsage::class, 'consumable_usage_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
