<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionBillingPeriod extends Model
{
    use HasUuids;

    protected $fillable = [
        'company_subscription_id',
        'period_index',
        'starts_on',
        'ends_on',
        'closed_at',
        'superseded_by_period_id',
    ];

    protected function casts(): array
    {
        return [
            'starts_on' => 'date',
            'ends_on' => 'date',
            'closed_at' => 'datetime',
        ];
    }

    public function companySubscription(): BelongsTo
    {
        return $this->belongsTo(CompanySubscription::class, 'company_subscription_id');
    }

    public function supersededBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'superseded_by_period_id');
    }
}
