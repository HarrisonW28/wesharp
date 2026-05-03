<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SubscriptionStatus;
use Database\Factories\CompanySubscriptionFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CompanySubscription extends Model
{
    /** @use HasFactory<CompanySubscriptionFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    protected $fillable = [
        'company_id',
        'subscription_plan_id',
        'status',
        'starts_at',
        'renews_at',
        'cancelled_at',
        'billing_contact_id',
        'price_amount_minor_snapshot',
        'currency',
        'notes',
        'stripe_subscription_id',
        'stripe_last_payment_failed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => SubscriptionStatus::class,
            'starts_at' => 'date',
            'renews_at' => 'date',
            'cancelled_at' => 'datetime',
            'price_amount_minor_snapshot' => 'integer',
            'stripe_last_payment_failed_at' => 'datetime',
        ];
    }

    /** @param  Builder<CompanySubscription>  $query */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', SubscriptionStatus::Active->value);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id');
    }

    public function billingContact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'billing_contact_id');
    }

    /** @return HasMany<Order, CompanySubscription> */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'company_subscription_id');
    }

    /** @return HasMany<SubscriptionBillingPeriod, CompanySubscription> */
    public function billingPeriods(): HasMany
    {
        return $this->hasMany(SubscriptionBillingPeriod::class, 'company_subscription_id')
            ->orderBy('period_index');
    }

    /**
     * Display name for exports and legacy payloads (plan catalogue name).
     */
    public function planName(): string
    {
        return $this->relationLoaded('plan') && $this->plan !== null
            ? (string) $this->plan->name
            : 'Plan';
    }
}
