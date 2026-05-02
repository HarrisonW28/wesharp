<?php

declare(strict_types=1);

namespace App\Support\Notifications;

final class NotificationPreferenceNormalizer
{
    /** @var list<string> */
    public const KEYS = [
        NotificationTypeCategories::BOOKING_UPDATES,
        NotificationTypeCategories::ORDER_UPDATES,
        NotificationTypeCategories::SUBSCRIPTION_DIGEST,
    ];

    /**
     * @param  array<string, mixed>|null  $raw
     * @return array<string, bool>
     */
    public static function normalize(?array $raw): array
    {
        $out = [];
        foreach (self::KEYS as $key) {
            $out[$key] = true;
        }

        if ($raw === null) {
            return $out;
        }

        foreach (self::KEYS as $key) {
            if (array_key_exists($key, $raw)) {
                $out[$key] = (bool) $raw[$key];
            }
        }

        return $out;
    }
}
