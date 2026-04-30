<?php

namespace App\Models;

use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Order extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'company_id',
        'booking_id',
        'route_id',
        'order_status',
        'subtotal_pence',
        'tax_pence',
        'total_pence',
        'currency',
        'knife_count',
        'price_per_knife_pence',
        'discount_pence',
        'payment_status',
    ];

    protected function casts(): array
    {
        return [
            'order_status' => OrderStatus::class,
            'payment_status' => OrderPaymentStatus::class,
            'route_id' => 'string',
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

    public function operationalRoute(): BelongsTo
    {
        return $this->belongsTo(OperationalRoute::class, 'route_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function knives(): HasMany
    {
        return $this->hasMany(Knife::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function uploadedFiles(): MorphMany
    {
        return $this->morphMany(UploadedFile::class, 'fileable');
    }

    /** @param  Builder<Order>  $query */
    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('order_status', OrderStatus::Completed);
    }

    /**
     * @param  Builder<Order>  $query
     * @return Builder<Order>
     */
    public function scopeWhereCompanyCity(Builder $query, ?string $city): Builder
    {
        if ($city === null || $city === '') {
            return $query;
        }

        return $query->whereHas('company', fn (Builder $q): Builder => $q->where('city', $city));
    }
}
