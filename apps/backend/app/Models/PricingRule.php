<?php

namespace App\Models;

use App\Enums\ServiceType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PricingRule extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'service_area_id',
        'name',
        'service_type',
        'rule_kind',
        'priority',
        'amount_pence',
        'constraints',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'service_type' => ServiceType::class,
            'constraints' => 'array',
            'active' => 'boolean',
        ];
    }

    public function serviceArea(): BelongsTo
    {
        return $this->belongsTo(ServiceArea::class);
    }
}
