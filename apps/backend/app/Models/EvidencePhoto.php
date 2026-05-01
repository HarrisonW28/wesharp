<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\EvidencePhotoCategory;
use App\Enums\EvidencePhotoVisibility;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvidencePhoto extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'uploaded_file_id',
        'uploaded_by_user_id',
        'captured_at',
        'route_stop_id',
        'order_id',
        'knife_id',
        'category',
        'visibility',
        'caption',
        'notes',
        'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'captured_at' => 'datetime',
            'archived_at' => 'datetime',
            'category' => EvidencePhotoCategory::class,
            'visibility' => EvidencePhotoVisibility::class,
        ];
    }

    public function uploadedFile(): BelongsTo
    {
        return $this->belongsTo(UploadedFile::class, 'uploaded_file_id');
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    public function routeStop(): BelongsTo
    {
        return $this->belongsTo(RouteStop::class, 'route_stop_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function knife(): BelongsTo
    {
        return $this->belongsTo(Knife::class, 'knife_id');
    }

    public function scopeActive($query)
    {
        return $query->whereNull('archived_at');
    }
}
