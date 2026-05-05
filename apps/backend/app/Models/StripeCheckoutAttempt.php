<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\StripeCheckoutAttemptStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per Stripe Checkout Session for invoice (mode=payment) flows — updated via webhooks.
 */
final class StripeCheckoutAttempt extends Model
{
    use HasUuids;

    protected $table = 'stripe_checkout_attempts';

    protected $fillable = [
        'invoice_id',
        'order_id',
        'company_id',
        'stripe_checkout_session_id',
        'status',
        'amount_pence',
        'currency',
        'customer_email',
        'marketing_opt_in',
        'expires_at',
        'completed_at',
        'expired_at',
        'sales_follow_up_dispatched_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => StripeCheckoutAttemptStatus::class,
            'marketing_opt_in' => 'boolean',
            'expires_at' => 'datetime',
            'completed_at' => 'datetime',
            'expired_at' => 'datetime',
            'sales_follow_up_dispatched_at' => 'datetime',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
