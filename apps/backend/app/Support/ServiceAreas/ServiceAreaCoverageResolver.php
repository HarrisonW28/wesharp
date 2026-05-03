<?php

declare(strict_types=1);

namespace App\Support\ServiceAreas;

use App\Models\ServiceArea;
use Illuminate\Database\Eloquent\Collection;

/**
 * Picks the winning active {@see ServiceArea} for a normalised UK-style postcode using
 * radius inclusion when centre + radius are set (with successful geocoding), and
 * postcode-prefix rules otherwise (fallback when geocoding failed or an area has no radius).
 */
final class ServiceAreaCoverageResolver
{
    /**
     * Resolve coverage for public UX: when any active area uses a map radius, the postcode must
     * resolve via postcodes.io — unknown postcodes yield {@see InvalidUkPostcodeException}.
     *
     * @throws InvalidUkPostcodeException
     */
    public static function resolveForPublicApi(string $normalizedPostcode): ?ServiceArea
    {
        if ($normalizedPostcode === '') {
            return null;
        }

        $lat = null;
        $lng = null;

        if (self::anyActiveAreaUsesRadius()) {
            $geo = UkPostcodeGeocoder::lookupForPublicCheck($normalizedPostcode);
            if ($geo !== null) {
                $lat = $geo['lat'];
                $lng = $geo['lng'];
            }
        }

        return self::pickBestMatch($normalizedPostcode, $lat, $lng);
    }

    /**
     * Same matching rules without throwing: used by pricing and backwards-compatible call sites.
     * Geocoding failures fall back to prefix-only matching.
     */
    public static function resolveLenient(string $normalizedPostcode): ?ServiceArea
    {
        if ($normalizedPostcode === '') {
            return null;
        }

        $lat = null;
        $lng = null;

        if (self::anyActiveAreaUsesRadius()) {
            $geo = UkPostcodeGeocoder::lookupOptional($normalizedPostcode);
            if ($geo !== null) {
                $lat = $geo['lat'];
                $lng = $geo['lng'];
            }
        }

        return self::pickBestMatch($normalizedPostcode, $lat, $lng);
    }

    public static function postcodeMatchesArea(
        ServiceArea $area,
        string $normalizedPostcode,
        ?float $customerLat,
        ?float $customerLng,
    ): bool {
        if (! $area->active) {
            return false;
        }

        $hasGeo = self::areaHasUsableRadius($area);
        $prefix = strtoupper(trim((string) $area->postcode_prefix));
        $hasPrefix = $prefix !== '';

        if ($hasGeo && $customerLat !== null && $customerLng !== null) {
            $distance = Haversine::metresBetween(
                (float) $area->centre_latitude,
                (float) $area->centre_longitude,
                $customerLat,
                $customerLng,
            );

            if ($distance <= (float) $area->radius_metres) {
                return true;
            }

            return false;
        }

        if ($hasPrefix && str_starts_with($normalizedPostcode, $prefix)) {
            return true;
        }

        return false;
    }

    /**
     * @return list<ServiceArea>
     */
    public static function matchingActiveAreas(string $normalizedPostcode, ?float $customerLat, ?float $customerLng): array
    {
        /** @var Collection<int, ServiceArea> $areas */
        $areas = ServiceArea::query()->where('active', true)->orderBy('name')->get();
        $out = [];
        foreach ($areas as $area) {
            if (self::postcodeMatchesArea($area, $normalizedPostcode, $customerLat, $customerLng)) {
                $out[] = $area;
            }
        }

        return $out;
    }

    private static function pickBestMatch(string $normalizedPostcode, ?float $lat, ?float $lng): ?ServiceArea
    {
        $matches = self::matchingActiveAreas($normalizedPostcode, $lat, $lng);
        if ($matches === []) {
            return null;
        }

        if (count($matches) === 1) {
            return $matches[0];
        }

        usort($matches, static function (ServiceArea $a, ServiceArea $b) use ($lat, $lng, $normalizedPostcode): int {
            $prefixLen = static function (ServiceArea $area) use ($normalizedPostcode): int {
                $p = strtoupper(trim((string) $area->postcode_prefix));
                if ($p === '' || ! str_starts_with($normalizedPostcode, $p)) {
                    return 0;
                }

                return strlen($p);
            };

            $la = $prefixLen($a);
            $lb = $prefixLen($b);
            if ($la !== $lb) {
                return $lb <=> $la;
            }

            if ($lat !== null && $lng !== null && self::areaHasUsableRadius($a) && self::areaHasUsableRadius($b)) {
                $da = Haversine::metresBetween(
                    (float) $a->centre_latitude,
                    (float) $a->centre_longitude,
                    $lat,
                    $lng
                );
                $db = Haversine::metresBetween(
                    (float) $b->centre_latitude,
                    (float) $b->centre_longitude,
                    $lat,
                    $lng
                );
                if (abs($da - $db) > 1) {
                    return $da <=> $db;
                }
                $ra = (int) $a->radius_metres;
                $rb = (int) $b->radius_metres;
                if ($ra !== $rb) {
                    return $ra <=> $rb;
                }
            }

            return strcmp((string) $a->name, (string) $b->name);
        });

        return $matches[0];
    }

    public static function anyActiveAreaUsesRadius(): bool
    {
        return ServiceArea::query()
            ->where('active', true)
            ->whereNotNull('centre_latitude')
            ->whereNotNull('centre_longitude')
            ->whereNotNull('radius_metres')
            ->where('radius_metres', '>=', 50)
            ->exists();
    }

    private static function areaHasUsableRadius(ServiceArea $area): bool
    {
        if ($area->centre_latitude === null || $area->centre_longitude === null || $area->radius_metres === null) {
            return false;
        }

        return (int) $area->radius_metres >= 50;
    }
}
