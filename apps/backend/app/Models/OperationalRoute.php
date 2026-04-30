<?php

namespace App\Models;

use App\Enums\OperationalRouteStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OperationalRoute extends Model
{
    use HasFactory;
    use HasUuids;

    protected $table = 'routes';

    protected $fillable = [
        'name',
        'route_status',
        'scheduled_date',
        'coverage_city',
        'driver_user_id',
        'notes',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'route_status' => OperationalRouteStatus::class,
            'scheduled_date' => 'date',
            'meta' => 'array',
        ];
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_user_id');
    }

    public function stops(): HasMany
    {
        return $this->hasMany(RouteStop::class, 'route_id')->orderBy('sequence');
    }
}
