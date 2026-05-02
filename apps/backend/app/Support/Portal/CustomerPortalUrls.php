<?php

declare(strict_types=1);

namespace App\Support\Portal;

/**
 * Customer-safe paths (no raw UUIDs in visible labels; deep links use portal routing as implemented in the frontend).
 */
final class CustomerPortalUrls
{
    public static function base(): string
    {
        return rtrim((string) config('wesharp.customer_portal_base_url', config('app.url')), '/');
    }

    public static function bookings(): string
    {
        return self::base().'/account/bookings';
    }

    public static function orders(): string
    {
        return self::base().'/account/orders';
    }

    public static function invoices(): string
    {
        return self::base().'/account/invoices';
    }

    public static function subscription(): string
    {
        return self::base().'/account/subscription';
    }
}
