<?php

declare(strict_types=1);

namespace App\Support\ServiceAreas;

use App\Models\ServiceArea;

final class ServiceAreaPostcodeMatcher
{
    public static function normalize(string $postcode): string
    {
        return strtoupper(preg_replace('/\s+/', '', trim($postcode)) ?? '');
    }

    public static function resolveActiveArea(string $normalizedPostcode): ?ServiceArea
    {
        if ($normalizedPostcode === '') {
            return null;
        }

        /** @var Collection<int, ServiceArea> $areas */
        return ServiceAreaCoverageResolver::resolveLenient($normalizedPostcode);
    }
}
