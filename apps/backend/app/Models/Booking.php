<?php

namespace App\Models;

use App\Enums\BookingStatus;
use App\Enums\ServiceType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Booking extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'company_id',
        'company_location_id',
        'contact_id',
        'assigned_route_id',
        'booking_status',
        'service_type',
        'scheduled_date',
        'cancellation_reason',
        'requested_collection_date',
        'requested_time_window_start',
        'requested_time_window_end',
        'confirmed_collection_date',
        'confirmed_time_window_start',
        'confirmed_time_window_end',
        'time_window_start',
        'time_window_end',
        'estimated_knife_count',
        'actual_knife_count',
        'customer_notes',
        'internal_notes',
        'price_estimate_pence',
    ];

    protected function casts(): array
    {
        return [
            'booking_status' => BookingStatus::class,
            'service_type' => ServiceType::class,
            'scheduled_date' => 'date',
            'requested_collection_date' => 'date',
            'confirmed_collection_date' => 'date',
            'estimated_knife_count' => 'integer',
            'actual_knife_count' => 'integer',
            'price_estimate_pence' => 'integer',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(CompanyLocation::class, 'company_location_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /** Operational route (“vehicle run”) assignment for this booking. */
    public function assignedRoute(): BelongsTo
    {
        return $this->belongsTo(OperationalRoute::class, 'assigned_route_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function knives(): HasMany
    {
        return $this->hasMany(Knife::class);
    }

    public function routeStop(): HasOne
    {
        return $this->hasOne(RouteStop::class);
    }

    public function uploadedFiles(): MorphMany
    {
        return $this->morphMany(UploadedFile::class, 'fileable');
    }

    /**
     * @param  Builder<Booking>  $query
     * @return Builder<Booking>
     */
    public function scopeWhereCompanyCity(Builder $query, ?string $city): Builder
    {
        if ($city === null || $city === '') {
            return $query;
        }

        return $query->whereHas('company', fn (Builder $q): Builder => $q->where('city', $city));
    }
}
