<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceArea extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'name',
        'city',
        'region',
        'country',
        'postcode_prefix',
        'centre_latitude',
        'centre_longitude',
        'radius_metres',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'centre_latitude' => 'float',
            'centre_longitude' => 'float',
            'radius_metres' => 'integer',
        ];
    }

    public function pricingRules(): HasMany
    {
        return $this->hasMany(PricingRule::class);
    }
}
