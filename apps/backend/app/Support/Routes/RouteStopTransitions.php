<?php

namespace App\Support\Routes;

use App\Enums\RouteStopStatus;

final readonly class RouteStopTransitions
{
    /** @var array<string, list<string>> */
    private const EDGES = [
        RouteStopStatus::NotStarted->value => [
            RouteStopStatus::Travelling->value,
            RouteStopStatus::Skipped->value,
        ],

        RouteStopStatus::Travelling->value => [
            RouteStopStatus::Arrived->value,
            RouteStopStatus::Skipped->value,
        ],

        RouteStopStatus::Arrived->value => [
            RouteStopStatus::Collected->value,
            RouteStopStatus::Skipped->value,
        ],

        RouteStopStatus::Collected->value => [
            RouteStopStatus::InSharpening->value,
            RouteStopStatus::Returned->value,
        ],

        RouteStopStatus::InSharpening->value => [
            RouteStopStatus::Returned->value,
        ],

        RouteStopStatus::Returned->value => [
            RouteStopStatus::Completed->value,
        ],

        RouteStopStatus::Completed->value => [],
        RouteStopStatus::Skipped->value => [],
    ];

    public static function assertCan(RouteStopStatus $from, RouteStopStatus $to): void
    {
        if ($from === $to) {
            return;
        }

        $targets = self::EDGES[$from->value] ?? [];

        if (! in_array($to->value, $targets, true)) {
            abort(422, sprintf('Invalid route-stop status transition: %s → %s.', $from->value, $to->value));
        }
    }
}
