<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BillingInterval;
use Database\Factories\SubscriptionPlanFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SubscriptionPlan extends Model
{
    /** @use HasFactory<SubscriptionPlanFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'billing_interval',
        'price_amount_minor',
        'currency',
        'included_collections',
        'included_knife_allowance',
        'overage_price_amount_minor',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'billing_interval' => BillingInterval::class,
            'price_amount_minor' => 'integer',
            'included_collections' => 'integer',
            'included_knife_allowance' => 'integer',
            'overage_price_amount_minor' => 'integer',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /** @param  Builder<SubscriptionPlan>  $query */
    public function scopeActiveCatalog(Builder $query): Builder
    {
        return $query->where('is_active', true)->whereNull('deleted_at');
    }

    public function companySubscriptions(): HasMany
    {
        return $this->hasMany(CompanySubscription::class, 'subscription_plan_id');
    }
}
