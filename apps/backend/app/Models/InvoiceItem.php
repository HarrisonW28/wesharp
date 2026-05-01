<?php

namespace App\Models;

use App\Enums\InvoiceLineItemType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceItem extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'invoice_id',
        'description',
        'quantity',
        'unit_amount_pence',
        'line_total_pence',
        'line_item_type',
    ];

    protected function casts(): array
    {
        return [
            'line_item_type' => InvoiceLineItemType::class,
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
