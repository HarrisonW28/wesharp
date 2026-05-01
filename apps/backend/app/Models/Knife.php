<?php

namespace App\Models;

use App\Enums\KnifeStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Knife extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'company_id',
        'booking_id',
        'order_id',
        'knife_status',
        'tag_id',
        'knife_type',
        'brand',
        'description',
        'condition_before',
        'damage_notes',
        'label',
        'position',
        'notes',
        'sharpened_by_user_id',
        'quality_checked_by_user_id',
        'returned_by_user_id',
        'inspection_condition',
        'inspection_notes',
        'inspection_internal_notes',
        'inspection_customer_visible',
        'inspected_by_user_id',
        'inspected_at',
    ];

    protected function casts(): array
    {
        return [
            'knife_status' => KnifeStatus::class,
            'inspection_customer_visible' => 'boolean',
            'inspected_at' => 'datetime',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** @return HasMany<KnifeServiceAssignment, Knife> */
    public function serviceAssignments(): HasMany
    {
        return $this->hasMany(KnifeServiceAssignment::class)->orderByDesc('linked_at');
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function sharpenedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sharpened_by_user_id');
    }

    public function qualityCheckedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'quality_checked_by_user_id');
    }

    public function returnedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'returned_by_user_id');
    }

    public function inspectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspected_by_user_id');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(KnifePhoto::class);
    }

    public function damageReports(): HasMany
    {
        return $this->hasMany(DamageReport::class);
    }

    /** @return HasMany<EvidencePhoto, Knife> */
    public function evidencePhotos(): HasMany
    {
        return $this->hasMany(EvidencePhoto::class, 'knife_id');
    }

    public function uploadedFiles(): MorphMany
    {
        return $this->morphMany(UploadedFile::class, 'fileable');
    }

    /** Post-sharpening workshop states (counted as sharpened throughput). */
    public function scopeSharpenedThroughput(Builder $query): Builder
    {
        return $query->whereIn('knife_status', [
            KnifeStatus::Sharpened,
            KnifeStatus::QualityChecked,
            KnifeStatus::Returned,
        ]);
    }

    /**
     * @param  Builder<Knife>  $query
     * @return Builder<Knife>
     */
    public function scopeWhereCompanyCity(Builder $query, ?string $city): Builder
    {
        if ($city === null || $city === '') {
            return $query;
        }

        return $query->whereHas('company', fn (Builder $q): Builder => $q->where('city', $city));
    }
}
