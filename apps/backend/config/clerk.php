<?php

use App\Enums\UserRole;
use App\Enums\UserStatus;

return [

    'secret' => env('CLERK_SECRET_KEY'),

    /**
     * JWKS URL — usually https://{frontend_api}/.well-known/jwks.json
     * Clerk dashboard: API keys → Advanced → JWT / JWKS endpoints.
     */
    'jwks_url' => env('CLERK_JWKS_URL'),

    /**
     * Issuer claim (iss) must match for session JWTs.
     * Example: https://your-instance.clerk.accounts.dev
     */
    'jwt_issuer' => env('CLERK_JWT_ISSUER'),

    /** Optional: require audience (azp) claim to match this Frontend API / instance id. */
    'jwt_audience' => env('CLERK_JWT_AUDIENCE'),

    /**
     * Clerk REST API base URL (user profile sync on first login).
     */
    'api_base' => env('CLERK_API_BASE', 'https://api.clerk.com/v1'),

    /**
     * When a user signs in via Clerk for the first time, assign this role if not bootstrapped elsewhere.
     */
    'default_role' => env('CLERK_DEFAULT_USER_ROLE', UserRole::CustomerStaff->value),

    'default_status' => env('CLERK_DEFAULT_USER_STATUS', UserStatus::Active->value),

    /**
     * Allow unit tests to resolve a user without calling Clerk (PHPUnit only).
     */
    'testing_bypass_header' => env('CLERK_TESTING_BYPASS_HEADER', 'X-WeSharp-Test-User-Id'),
];
