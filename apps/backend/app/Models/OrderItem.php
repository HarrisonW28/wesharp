<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'order_id',
        'knife_id',
        'sku',
        'description',
        'quantity',
        'unit_amount_pence',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function knife(): BelongsTo
    {
        return $this->belongsTo(Knife::class);
    }
}
