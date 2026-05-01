<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\EvidencePhotoVisibility;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerPortalUpdate extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'company_id',
        'booking_id',
        'order_id',
        'route_stop_id',
        'body',
        'visibility',
        'created_by_user_id',
        'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'visibility' => EvidencePhotoVisibility::class,
            'archived_at' => 'datetime',
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

    public function routeStop(): BelongsTo
    {
        return $this->belongsTo(RouteStop::class, 'route_stop_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /** @param  \Illuminate\Database\Eloquent\Builder<static>  $query */
    public function scopeActive($query)
    {
        return $query->whereNull('archived_at');
    }
}
