<?php

declare(strict_types=1);

namespace App\Support\Notifications;

/**
 * Maps notification {@see NotificationDelivery::$type} values to customer-editable preference buckets.
 * Types that return null are always sent when the global notification system is enabled.
 */
final class NotificationTypeCategories
{
    public const BOOKING_UPDATES = 'booking_updates';

    public const ORDER_UPDATES = 'order_updates';

    public const SUBSCRIPTION_DIGEST = 'subscription_digest';

    /** @return self::BOOKING_UPDATES|self::ORDER_UPDATES|self::SUBSCRIPTION_DIGEST|null */
    public static function optionalCategoryForType(string $type): ?string
    {
        if (str_starts_with($type, 'booking.')) {
            return self::BOOKING_UPDATES;
        }

        if (str_starts_with($type, 'order.')) {
            return self::ORDER_UPDATES;
        }

        if (in_array($type, [
            'subscription.renewal.upcoming',
            'subscription.usage.period_summary',
            'subscription.usage.allowance_heads_up',
        ], true)) {
            return self::SUBSCRIPTION_DIGEST;
        }

        return null;
    }
}
