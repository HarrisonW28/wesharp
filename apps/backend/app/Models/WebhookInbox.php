<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Idempotent delivery log for incoming provider webhooks (Clerk/Svix, future providers).
 *
 * @property int $id
 * @property string $provider
 * @property string $external_id
 * @property string $event_type
 * @property string $processing_state
 * @property string|null $last_error
 */
final class WebhookInbox extends Model
{
    protected $table = 'webhook_inbox';

    protected $fillable = [
        'provider',
        'external_id',
        'event_type',
        'processing_state',
        'last_error',
        'received_at',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'received_at' => 'datetime',
            'processed_at' => 'datetime',
        ];
    }
}
