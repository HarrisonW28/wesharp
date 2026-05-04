<?php

declare(strict_types=1);

namespace App\Support\Stripe;

/**
 * Non-reversible previews for API responses — never log or persist masked output as secrets.
 */
final class StripeKeyMask
{
    public static function stripeSecret(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return self::ellipsisAfterPrefix($value, 7, 4);
    }

    public static function publishable(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return self::ellipsisAfterPrefix($value, 8, 4);
    }

    public static function webhookSecret(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return self::ellipsisAfterPrefix($value, 6, 4);
    }

    private static function ellipsisAfterPrefix(string $value, int $prefixLen, int $suffixLen): string
    {
        $len = strlen($value);
        if ($len <= $prefixLen + $suffixLen) {
            return substr($value, 0, $prefixLen).'••••';
        }

        return substr($value, 0, $prefixLen).'••••••••'.substr($value, -$suffixLen);
    }
}
