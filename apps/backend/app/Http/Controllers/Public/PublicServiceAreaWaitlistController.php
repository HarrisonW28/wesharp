<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StorePublicServiceAreaWaitlistRequest;
use App\Models\ServiceAreaWaitlistSignup;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use App\Support\ServiceAreas\InvalidUkPostcodeException;
use App\Support\ServiceAreas\ServiceAreaCoverageResolver;
use App\Support\ServiceAreas\ServiceAreaPostcodeMatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

final class PublicServiceAreaWaitlistController extends Controller
{
    public function store(StorePublicServiceAreaWaitlistRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $normalized = ServiceAreaPostcodeMatcher::normalize((string) $validated['postcode']);

        try {
            $resolved = ServiceAreaCoverageResolver::resolveForPublicApi($normalized);
        } catch (InvalidUkPostcodeException) {
            return ApiResponses::error(
                'We could not find that UK postcode. Check the spelling and try again.',
                'invalid_postcode',
                422
            );
        }

        if ($resolved !== null) {
            return ApiResponses::error(
                'That postcode is already inside our collection area — you can request a pickup on the booking page.',
                'in_service_area',
                422
            );
        }

        $source = isset($validated['source']) && is_string($validated['source']) && $validated['source'] !== ''
            ? (string) $validated['source']
            : 'service_areas_page';

        $signup = ServiceAreaWaitlistSignup::query()->create([
            'name' => (string) $validated['name'],
            'email' => strtolower(trim((string) $validated['email'])),
            'postcode' => trim((string) $validated['postcode']),
            'postcode_normalized' => $normalized,
            'customer_type' => (string) $validated['customer_type'],
            'estimated_knife_count' => isset($validated['estimated_knife_count'])
                ? (int) $validated['estimated_knife_count']
                : null,
            'notes' => isset($validated['notes']) && is_string($validated['notes']) && $validated['notes'] !== ''
                ? (string) $validated['notes']
                : null,
            'source' => $source,
            'contact_consent' => true,
        ]);

        AuditRecorder::record(null, $signup, 'public.service_area_waitlist_signup', [
            'customer_type' => $signup->customer_type,
            'email_domain' => Str::after($signup->email, '@') ?: '-',
            'source' => $signup->source,
        ], $request);

        return ApiResponses::success([
            'accepted' => true,
            'message' => 'Thanks — we have your details and will be in touch if we expand to your area.',
        ], 201);
    }
}
