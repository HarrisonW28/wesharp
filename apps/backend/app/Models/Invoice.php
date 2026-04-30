<?php

namespace App\Models;

use App\Enums\InvoiceStatus;
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
    ];

    protected function casts(): array
    {
        return [
            'invoice_status' => InvoiceStatus::class,
            'issued_on' => 'date',
            'due_on' => 'date',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
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
}
