<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'respect_booking_notification_opt_out',
    'respect_order_notification_opt_out',
    'respect_subscription_digest_opt_out',
])]
final class NotificationAdminSetting extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'respect_booking_notification_opt_out' => 'boolean',
            'respect_order_notification_opt_out' => 'boolean',
            'respect_subscription_digest_opt_out' => 'boolean',
        ];
    }

    public static function current(): self
    {
        /** @var self $row */
        $row = self::query()->orderBy('id')->firstOrFail();

        return $row;
    }
}
