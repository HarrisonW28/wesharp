<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StorePublicServiceAreaWaitlistRequest;
use App\Models\ServiceAreaWaitlistSignup;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use App\Support\ServiceAreas\ServiceAreaPostcodeMatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

final class PublicServiceAreaWaitlistController extends Controller
{
    public function store(StorePublicServiceAreaWaitlistRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $normalized = ServiceAreaPostcodeMatcher::normalize((string) $validated['postcode']);

        if (ServiceAreaPostcodeMatcher::resolveActiveArea($normalized) !== null) {
            return ApiResponses::error(
                'That postcode is already inside our collection area — you can request a pickup on the booking page.',
                'in_service_area',
                422
            );
        }

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
        ]);

        AuditRecorder::record(null, $signup, 'public.service_area_waitlist_signup', [
            'customer_type' => $signup->customer_type,
            'email_domain' => Str::after($signup->email, '@') ?: '-',
        ], $request);

        return ApiResponses::success([
            'accepted' => true,
            'message' => 'Thanks — we have your details and will be in touch if we expand to your area.',
        ], 201);
    }
}
