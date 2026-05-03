<?php

declare(strict_types=1);

namespace App\Support\ServiceAreas;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Free UK postcode → coordinates via api.postcodes.io (no API key).
 */
final class UkPostcodeGeocoder
{
    private const BASE = 'https://api.postcodes.io';

    /**
     * @return array{lat: float, lng: float}|null
     */
    public static function lookupOptional(string $normalizedPostcode): ?array
    {
        $outcome = self::lookup($normalizedPostcode);

        return match ($outcome['kind']) {
            'found' => ['lat' => $outcome['lat'], 'lng' => $outcome['lng']],
            'not_found', 'unavailable' => null,
        };
    }

    /**
     * @return array{lat: float, lng: float}|null Null when postcodes.io is temporarily unavailable
     *
     * @throws InvalidUkPostcodeException when the postcode is not found (HTTP 404)
     */
    public static function lookupForPublicCheck(string $normalizedPostcode): ?array
    {
        $outcome = self::lookup($normalizedPostcode);

        return match ($outcome['kind']) {
            'found' => ['lat' => $outcome['lat'], 'lng' => $outcome['lng']],
            'not_found' => throw new InvalidUkPostcodeException('Unknown UK postcode.'),
            'unavailable' => null,
        };
    }

    /**
     * @return array{kind: 'found', lat: float, lng: float}|array{kind: 'not_found'}|array{kind: 'unavailable'}
     */
    private static function lookup(string $normalizedPostcode): array
    {
        $normalizedPostcode = trim($normalizedPostcode);
        if ($normalizedPostcode === '') {
            return ['kind' => 'not_found'];
        }

        $encoded = rawurlencode($normalizedPostcode);

        try {
            $response = Http::timeout(5)
                ->withHeaders(['User-Agent' => 'WeSharp/1.0 (service-area-coverage)'])
                ->acceptJson()
                ->get(self::BASE.'/postcodes/'.$encoded);
        } catch (Throwable $e) {
            Log::warning('uk_postcode_geocoder.http_failed', [
                'message' => $e->getMessage(),
                'postcode' => $normalizedPostcode,
            ]);

            return ['kind' => 'unavailable'];
        }

        if ($response->status() === 404) {
            return ['kind' => 'not_found'];
        }

        if (! $response->successful()) {
            Log::warning('uk_postcode_geocoder.bad_response', [
                'status' => $response->status(),
                'postcode' => $normalizedPostcode,
            ]);

            return ['kind' => 'unavailable'];
        }

        /** @var array<string, mixed>|null $json */
        $json = $response->json();
        $result = is_array($json) ? ($json['result'] ?? null) : null;
        if (! is_array($result)) {
            return ['kind' => 'unavailable'];
        }

        $lat = $result['latitude'] ?? null;
        $lng = $result['longitude'] ?? null;
        if (! is_numeric($lat) || ! is_numeric($lng)) {
            return ['kind' => 'unavailable'];
        }

        return [
            'kind' => 'found',
            'lat' => (float) $lat,
            'lng' => (float) $lng,
        ];
    }
}
