<?php

namespace App\Models;

use App\Enums\CompanyStatus;
use App\Enums\SubscriptionStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends Model
{
    use HasFactory;
    use HasUuids;
    use SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'company_status',
        'is_sole_customer',
        'phone',
        'billing_email',
        'city',
        'stripe_customer_id',
    ];

    protected function casts(): array
    {
        return [
            'company_status' => CompanyStatus::class,
            'is_sole_customer' => 'boolean',
        ];
    }

    public function locations(): HasMany
    {
        return $this->hasMany(CompanyLocation::class);
    }

    /**
     * The company's single active subscription (billing slot), if any.
     */
    public function subscription(): HasOne
    {
        return $this->hasOne(CompanySubscription::class)
            ->where('status', SubscriptionStatus::Active->value);
    }

    /**
     * Active or past-due subscription occupying the single operational billing slot.
     */
    public function operationalSubscription(): HasOne
    {
        return $this->hasOne(CompanySubscription::class)
            ->whereIn('status', [
                SubscriptionStatus::Active->value,
                SubscriptionStatus::PastDue->value,
            ]);
    }

    /**
     * Full subscription history for the company (all statuses, excluding soft-deleted rows).
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(CompanySubscription::class)
            ->orderByDesc('starts_at')
            ->orderByDesc('created_at');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
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

    public function notes(): MorphMany
    {
        return $this->morphMany(Note::class, 'noteable');
    }

    public function uploadedFiles(): MorphMany
    {
        return $this->morphMany(UploadedFile::class, 'fileable');
    }

    public function damageReports(): HasMany
    {
        return $this->hasMany(DamageReport::class);
    }

    /** Companies considered active for CRM / analytics. */
    public function scopeAnalyticsActive(Builder $query): Builder
    {
        return $query->whereIn('company_status', [
            CompanyStatus::Active,
            CompanyStatus::TrialCompleted,
            CompanyStatus::AtRisk,
        ]);
    }

    /**
     * @param  Builder<Company>  $query
     * @return Builder<Company>
     */
    public function scopeWhereCityIf(Builder $query, ?string $city): Builder
    {
        if ($city === null || $city === '') {
            return $query;
        }

        return $query->where('city', $city);
    }
}
