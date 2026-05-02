<?php

declare(strict_types=1);

namespace App\Support\ServiceAreas;

use App\Models\ServiceArea;
use Illuminate\Support\Collection;

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
        $areas = ServiceArea::query()
            ->where('active', true)
            ->whereNotNull('postcode_prefix')
            ->where('postcode_prefix', '!=', '')
            ->get();

        $best = null;
        $bestLen = -1;

        foreach ($areas as $area) {
            $prefix = strtoupper(trim((string) $area->postcode_prefix));
            if ($prefix === '') {
                continue;
            }
            if (str_starts_with($normalizedPostcode, $prefix) && strlen($prefix) > $bestLen) {
                $best = $area;
                $bestLen = strlen($prefix);
            }
        }

        return $best;
    }
}
