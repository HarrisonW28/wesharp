<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'company_id',
        'invoice_id',
        'order_id',
        'amount_pence',
        'payment_status',
        'payment_method',
        'currency',
        'paid_at',
        'due_at',
        'reference',
        'notes',
        'recorded_by',
        'external_provider_id',
        'stripe_checkout_session_id',
        'stripe_payment_intent_id',
    ];

    protected function casts(): array
    {
        return [
            'payment_status' => PaymentStatus::class,
            'payment_method' => PaymentMethod::class,
            'paid_at' => 'datetime',
            'due_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class)->withTrashed();
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }
}
