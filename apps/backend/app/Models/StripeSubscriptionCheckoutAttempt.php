<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\StripeCheckoutAttemptStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Tracks Stripe Checkout mode=subscription sessions for abandonment follow-up. */
final class StripeSubscriptionCheckoutAttempt extends Model
{
    use HasUuids;

    protected $table = 'stripe_subscription_checkout_attempts';

    protected $fillable = [
        'company_id',
        'subscription_plan_id',
        'stripe_checkout_session_id',
        'status',
        'amount_pence',
        'currency',
        'customer_email',
        'expires_at',
        'completed_at',
        'expired_at',
        'follow_up_dispatched_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => StripeCheckoutAttemptStatus::class,
            'expires_at' => 'datetime',
            'completed_at' => 'datetime',
            'expired_at' => 'datetime',
            'follow_up_dispatched_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id');
    }
}
