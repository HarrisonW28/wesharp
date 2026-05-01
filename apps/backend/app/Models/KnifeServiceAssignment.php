<?php

namespace App\Models;

use App\Enums\KnifeServiceKind;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KnifeServiceAssignment extends Model
{
    use HasUuids;

    protected $fillable = [
        'knife_id',
        'order_id',
        'company_id',
        'service_kind',
        'linked_at',
        'unlinked_at',
    ];

    protected function casts(): array
    {
        return [
            'service_kind' => KnifeServiceKind::class,
            'linked_at' => 'datetime',
            'unlinked_at' => 'datetime',
        ];
    }

    public function knife(): BelongsTo
    {
        return $this->belongsTo(Knife::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
