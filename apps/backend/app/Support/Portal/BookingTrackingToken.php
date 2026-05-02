<?php

declare(strict_types=1);

namespace App\Support\Portal;

use App\Models\Booking;
use Illuminate\Support\Str;

/**
 * HMAC-signed opaque token so customers can open a tracking page without logging in.
 */
final class BookingTrackingToken
{
    private const DEFAULT_TTL_DAYS = 90;

    public static function mint(Booking $booking, ?int $ttlDays = null): string
    {
        $ttlDays ??= self::DEFAULT_TTL_DAYS;
        $expiresAt = time() + max(1, $ttlDays) * 86400;
        $id = (string) $booking->id;
        $payload = $id.'|'.$expiresAt;
        $signature = hash_hmac('sha256', $payload, self::signingSecret());

        return rtrim(strtr(base64_encode($payload.'|'.$signature), '+/', '-_'), '=');
    }

    /**
     * @return string|null Booking UUID or null if invalid / expired.
     */
    public static function parseBookingId(string $token): ?string
    {
        $decoded = base64_decode(strtr($token, '-_', '+/'), true);
        if ($decoded === false || ! str_contains($decoded, '|')) {
            return null;
        }

        $parts = explode('|', $decoded);
        if (count($parts) !== 3) {
            return null;
        }

        [$id, $expiresAt, $signature] = $parts;
        if (! Str::isUuid($id) || ! ctype_digit($expiresAt)) {
            return null;
        }

        if ((int) $expiresAt < time()) {
            return null;
        }

        $payload = $id.'|'.$expiresAt;
        $expected = hash_hmac('sha256', $payload, self::signingSecret());
        if (! hash_equals($expected, $signature)) {
            return null;
        }

        return $id;
    }

    private static function signingSecret(): string
    {
        $key = (string) config('app.key');

        if (str_starts_with($key, 'base64:')) {
            $decoded = base64_decode(substr($key, 7), true);
            if ($decoded !== false && $decoded !== '') {
                return $decoded;
            }
        }

        return $key;
    }
}
