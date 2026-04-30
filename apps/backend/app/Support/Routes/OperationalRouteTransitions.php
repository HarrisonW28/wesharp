<?php

namespace App\Support\Routes;

use App\Enums\OperationalRouteStatus;

final readonly class OperationalRouteTransitions
{
    /** @var array<string, list<string>> */
    private const EDGES = [
        OperationalRouteStatus::Draft->value => [
            OperationalRouteStatus::Scheduled->value,
            OperationalRouteStatus::Cancelled->value,
        ],

        OperationalRouteStatus::Scheduled->value => [
            OperationalRouteStatus::InProgress->value,
            OperationalRouteStatus::Cancelled->value,
        ],

        OperationalRouteStatus::InProgress->value => [
            OperationalRouteStatus::Completed->value,
            OperationalRouteStatus::Cancelled->value,
        ],

        OperationalRouteStatus::Completed->value => [],
        OperationalRouteStatus::Cancelled->value => [],
    ];

    public static function assertCan(OperationalRouteStatus $from, OperationalRouteStatus $to): void
    {
        if ($from === $to) {
            return;
        }

        $targets = self::EDGES[$from->value] ?? [];

        if (! in_array($to->value, $targets, true)) {
            abort(422, sprintf('Invalid route status transition: %s → %s.', $from->value, $to->value));
        }
    }
}
