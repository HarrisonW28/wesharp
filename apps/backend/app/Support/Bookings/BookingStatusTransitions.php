<?php

namespace App\Support\Bookings;

use App\Enums\BookingStatus;

/**
 * Single source for allowed transitions. Admin actions delegate here.
 *
 * Confirm / cancel / assign / convert endpoints must reject invalid hops with 422.
 */
final readonly class BookingStatusTransitions
{
    /** @var array<string, list<string>> */
    private const EDGES = [
        BookingStatus::Requested->value => [
            BookingStatus::Confirmed->value,
            BookingStatus::Cancelled->value,
        ],

        BookingStatus::Confirmed->value => [
            BookingStatus::AssignedToRoute->value,
            BookingStatus::ConvertedToOrder->value,
            BookingStatus::Cancelled->value,
        ],

        BookingStatus::AssignedToRoute->value => [
            BookingStatus::Collected->value,
            BookingStatus::ConvertedToOrder->value,
            BookingStatus::Cancelled->value,
        ],

        BookingStatus::Collected->value => [
            BookingStatus::InSharpening->value,
            BookingStatus::ConvertedToOrder->value,
            BookingStatus::Cancelled->value,
        ],

        BookingStatus::InSharpening->value => [
            BookingStatus::QualityChecked->value,
            BookingStatus::Cancelled->value,
        ],

        BookingStatus::QualityChecked->value => [
            BookingStatus::Returned->value,
            BookingStatus::Cancelled->value,
        ],

        BookingStatus::Returned->value => [
            BookingStatus::Completed->value,
            BookingStatus::NoShow->value,
        ],

        BookingStatus::NoShow->value => [],
        BookingStatus::Cancelled->value => [],
        BookingStatus::Completed->value => [],
        BookingStatus::ConvertedToOrder->value => [],
    ];

    public static function can(BookingStatus $from, BookingStatus $to): bool
    {
        if ($from === $to) {
            return false;
        }

        $targets = self::EDGES[$from->value] ?? [];

        return in_array($to->value, $targets, true);
    }

    /** @return list<string> */
    public static function allowedTargets(BookingStatus $from): array
    {
        return array_values(self::EDGES[$from->value] ?? []);
    }

    /** Direct transition enforcing allowed graph (optional guard for generic updates). */
    public static function assertCanTransition(BookingStatus $from, BookingStatus $to): void
    {
        if (! self::can($from, $to)) {
            abort(422, sprintf(
                'Invalid booking status transition: %s → %s.',
                $from->value,
                $to->value
            ));
        }
    }
}
