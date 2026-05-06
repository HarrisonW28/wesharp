<?php

namespace App\Models;

use App\Enums\InvoiceStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'company_id',
        'order_id',
        'invoice_number',
        'invoice_status',
        'issued_on',
        'due_on',
        'subtotal_pence',
        'tax_pence',
        'total_pence',
        'currency',
        'customer_notes',
        'internal_notes',
        'is_subscription_billing',
        'stripe_checkout_session_id',
        'stripe_payment_intent_id',
        'source_type',
        'source_id',
        'billing_period_start',
        'billing_period_end',
    ];

    protected function casts(): array
    {
        return [
            'invoice_status' => InvoiceStatus::class,
            'issued_on' => 'date',
            'due_on' => 'date',
            'is_subscription_billing' => 'boolean',
            'billing_period_start' => 'date',
            'billing_period_end' => 'date',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class)->withTrashed();
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function stripeCheckoutAttempts(): HasMany
    {
        return $this->hasMany(StripeCheckoutAttempt::class);
    }

    /** Open AR (not settled, not void). */
    public function scopeOutstanding(Builder $query): Builder
    {
        return $query->whereNotIn('invoice_status', [InvoiceStatus::Paid, InvoiceStatus::Void]);
    }

    /**
     * @param  Builder<Invoice>  $query
     * @return Builder<Invoice>
     */
    public function scopeWhereCompanyCity(Builder $query, ?string $city): Builder
    {
        if ($city === null || $city === '') {
            return $query;
        }

        return $query->whereHas('company', fn (Builder $q): Builder => $q->where('city', $city));
    }
}
