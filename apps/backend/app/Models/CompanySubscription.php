<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompanySubscription extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'company_id',
        'plan_name',
        'status',
        'current_period_end',
        'included_services',
        'allowance_summary',
    ];

    protected function casts(): array
    {
        return [
            'current_period_end' => 'date',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
