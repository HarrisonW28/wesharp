<?php

namespace App\Models;

use App\Enums\KnifeStatus;
use App\Enums\SubscriptionOrderItemBillingKind;
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
        'service_status',
        'subscription_billing_kind',
    ];

    protected function casts(): array
    {
        return [
            'service_status' => KnifeStatus::class,
            'subscription_billing_kind' => SubscriptionOrderItemBillingKind::class,
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function knife(): BelongsTo
    {
        return $this->belongsTo(Knife::class);
    }
}
