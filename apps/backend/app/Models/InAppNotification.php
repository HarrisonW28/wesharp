<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\InAppNotificationAudience;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class InAppNotification extends Model
{
    use HasUuids;

    protected $table = 'in_app_notifications';

    protected $fillable = [
        'user_id',
        'audience',
        'kind',
        'title',
        'body',
        'path',
        'dedupe_key',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'audience' => InAppNotificationAudience::class,
            'read_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
