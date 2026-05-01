<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

final class NotificationDelivery extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'company_id',
        'recipient_user_id',
        'recipient_email',
        'recipient_name',
        'channel',
        'type',
        'source_type',
        'source_id',
        'status',
        'idempotency_key',
        'queued_at',
        'sent_at',
        'failed_at',
        'failure_reason',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'queued_at' => 'datetime',
            'sent_at' => 'datetime',
            'failed_at' => 'datetime',
            'meta' => 'array',
        ];
    }
}
