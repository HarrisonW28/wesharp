<?php

namespace App\Models;

use App\Enums\RouteStopStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RouteStop extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'route_id',
        'booking_id',
        'route_stop_status',
        'sequence',
        'expected_arrival_at',
        'arrived_at',
        'departed_at',
        'actual_knife_count',
        'damage_notes',
    ];

    protected function casts(): array
    {
        return [
            'route_stop_status' => RouteStopStatus::class,
            'expected_arrival_at' => 'datetime',
            'arrived_at' => 'datetime',
            'departed_at' => 'datetime',
            'actual_knife_count' => 'integer',
        ];
    }

    public function route(): BelongsTo
    {
        return $this->belongsTo(OperationalRoute::class, 'route_id');
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }
}
