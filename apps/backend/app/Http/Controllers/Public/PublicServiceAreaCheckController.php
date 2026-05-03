<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StorePublicServiceAreaCheckRequest;
use App\Support\ApiResponses;
use App\Support\ServiceAreas\InvalidUkPostcodeException;
use App\Support\ServiceAreas\NextScheduledCollectionDay;
use App\Support\ServiceAreas\ServiceAreaCoverageResolver;
use App\Support\ServiceAreas\ServiceAreaPostcodeMatcher;
use Illuminate\Http\JsonResponse;

final class PublicServiceAreaCheckController extends Controller
{
    public function store(StorePublicServiceAreaCheckRequest $request): JsonResponse
    {
        $normalized = ServiceAreaPostcodeMatcher::normalize((string) $request->validated('postcode'));

        try {
            $area = ServiceAreaCoverageResolver::resolveForPublicApi($normalized);
        } catch (InvalidUkPostcodeException) {
            return ApiResponses::error(
                'We could not find that UK postcode. Check the spelling and try again.',
                'invalid_postcode',
                422
            );
        }

        $next = $area !== null ? NextScheduledCollectionDay::nextDateIso() : null;

        return ApiResponses::success([
            'covered' => $area !== null,
            'area' => $area !== null ? [
                'id' => (string) $area->id,
                'label' => $area->region !== null && trim((string) $area->region) !== ''
                    ? (string) $area->region
                    : (string) $area->name,
                'city' => (string) $area->city,
            ] : null,
            'next_collection_date' => $next,
        ]);
    }
}
