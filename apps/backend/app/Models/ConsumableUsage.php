<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConsumableUsage extends Model
{
    use HasUuids;

    protected $fillable = [
        'consumable_id',
        'usage_date',
        'quantity_used',
        'order_id',
        'route_id',
        'knife_id',
        'notes',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'usage_date' => 'date',
            'quantity_used' => 'decimal:3',
        ];
    }

    public function consumable(): BelongsTo
    {
        return $this->belongsTo(Consumable::class, 'consumable_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function route(): BelongsTo
    {
        return $this->belongsTo(OperationalRoute::class, 'route_id');
    }

    public function knife(): BelongsTo
    {
        return $this->belongsTo(Knife::class, 'knife_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
