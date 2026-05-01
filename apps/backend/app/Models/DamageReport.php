<?php

namespace App\Models;

use App\Enums\DamageReportSeverity;
use App\Enums\DamageReportStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DamageReport extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'knife_id',
        'company_id',
        'order_id',
        'details',
        'internal_notes',
        'customer_visible',
        'customer_description',
        'severity',
        'status',
        'resolved_at',
        'archived_at',
        'reported_by_id',
    ];

    protected function casts(): array
    {
        return [
            'customer_visible' => 'boolean',
            'severity' => DamageReportSeverity::class,
            'status' => DamageReportStatus::class,
            'resolved_at' => 'datetime',
            'archived_at' => 'datetime',
        ];
    }

    /**
     * @param  Builder<DamageReport>  $query
     * @return Builder<DamageReport>
     */
    public function scopeNotArchived(Builder $query): Builder
    {
        return $query->whereNull('archived_at');
    }

    public function knife(): BelongsTo
    {
        return $this->belongsTo(Knife::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by_id');
    }

    /** @return HasMany<EvidencePhoto, DamageReport> */
    public function evidencePhotos(): HasMany
    {
        return $this->hasMany(EvidencePhoto::class, 'damage_report_id');
    }
}
