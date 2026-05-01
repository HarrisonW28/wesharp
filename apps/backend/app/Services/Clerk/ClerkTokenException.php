<?php

namespace App\Services\Clerk;

final class ClerkTokenException extends \RuntimeException
{
    public const string CODE_DEFAULT = 'clerk_auth_failed';

    public const string CODE_MISSING_JWKS_URL = 'clerk_missing_jwks_url';

    public const string CODE_JWKS_UNAVAILABLE = 'clerk_jwks_unavailable';

    public const string CODE_JWT_ISSUER = 'clerk_jwt_issuer_mismatch';

    public const string CODE_JWT_AUDIENCE = 'clerk_jwt_audience_mismatch';

    public const string CODE_JWT_EXPIRED = 'clerk_jwt_expired';

    public const string CODE_JWT_SIGNATURE = 'clerk_jwt_signature_invalid';

    public const string CODE_JWT_INVALID = 'clerk_jwt_invalid';

    public const string CODE_JWT_VERIFY_FAILED = 'clerk_jwt_verify_failed';

    public const string CODE_MISSING_BEARER = 'clerk_missing_bearer';

    public const string CODE_INVALID_SUBJECT = 'clerk_jwt_invalid_subject';

    public const string CODE_EMAIL_UNRESOLVABLE = 'clerk_email_unresolvable';

    public function __construct(
        string $message = '',
        private readonly string $apiCode = self::CODE_DEFAULT,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    public function apiCode(): string
    {
        return $this->apiCode;
    }
}
