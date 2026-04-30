<?php

namespace App\Models;

use App\Enums\KnifeStatus;
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
        'description',
        'condition_before',
        'damage_notes',
        'label',
        'position',
        'notes',
        'sharpened_by_user_id',
        'quality_checked_by_user_id',
        'returned_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'knife_status' => KnifeStatus::class,
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

    public function photos(): HasMany
    {
        return $this->hasMany(KnifePhoto::class);
    }

    public function damageReports(): HasMany
    {
        return $this->hasMany(DamageReport::class);
    }

    public function uploadedFiles(): MorphMany
    {
        return $this->morphMany(UploadedFile::class, 'fileable');
    }
}
