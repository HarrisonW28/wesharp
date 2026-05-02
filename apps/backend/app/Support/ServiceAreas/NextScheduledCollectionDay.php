<?php

declare(strict_types=1);

namespace App\Support\ServiceAreas;

use App\Enums\OperationalRouteStatus;
use App\Models\OperationalRoute;
use Carbon\CarbonInterface;

final class NextScheduledCollectionDay
{
    public static function nextDateIso(?string $todayUtc = null): ?string
    {
        $today = $todayUtc ?? now('UTC')->toDateString();

        /** @var OperationalRoute|null $route */
        $route = OperationalRoute::query()
            ->whereDate('scheduled_date', '>=', $today)
            ->whereNotIn('route_status', [
                OperationalRouteStatus::Completed,
                OperationalRouteStatus::Cancelled,
            ])
            ->orderBy('scheduled_date')
            ->first();

        if ($route === null || $route->scheduled_date === null) {
            return null;
        }

        $d = $route->scheduled_date;

        return $d instanceof CarbonInterface ? $d->format('Y-m-d') : (string) $d;
    }
}
