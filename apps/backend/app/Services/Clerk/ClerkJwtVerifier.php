<?php

namespace App\Services\Clerk;

use Firebase\JWT\ExpiredException;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\SignatureInvalidException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use stdClass;
use Throwable;
use UnexpectedValueException;

/**
 * Verifies Clerk-issued JWTs using the published JWKS document.
 */
final class ClerkJwtVerifier
{
    private const JWKS_CACHE_SECONDS = 900;

    private const JWT_LEEWAY_SECONDS = 60;

    /**
     * @throws ClerkTokenException
     */
    public function verify(string $jwtToken): stdClass
    {
        $jwksUrl = config('clerk.jwks_url');

        if ($jwksUrl === null || $jwksUrl === '') {
            throw new ClerkTokenException(
                'Missing CLERK_JWKS_URL configuration.',
                ClerkTokenException::CODE_MISSING_JWKS_URL
            );
        }

        try {
            /** @var array<string, mixed>|null $jwks */
            $jwks = Cache::remember('clerk_jwks', self::JWKS_CACHE_SECONDS, static function () use ($jwksUrl): array {
                $response = Http::timeout(8)->acceptJson()->get($jwksUrl);

                if ($response->failed()) {
                    Log::warning('clerk.jwks.fetch_failed', ['status' => $response->status()]);

                    throw new ClerkTokenException(
                        'Unable to load Clerk JWKS.',
                        ClerkTokenException::CODE_JWKS_UNAVAILABLE
                    );
                }

                $data = $response->json();

                return is_array($data) ? $data : [];
            });

            /** @var array<string, Key> $keys */
            $keys = JWK::parseKeySet($jwks, 'RS256');

            $headers = new stdClass;

            $leewayBefore = JWT::$leeway;
            try {
                JWT::$leeway = self::JWT_LEEWAY_SECONDS;
                $decoded = JWT::decode($jwtToken, $keys, $headers);
            } finally {
                JWT::$leeway = $leewayBefore;
            }

            $issuer = config('clerk.jwt_issuer');
            if (is_string($issuer) && $issuer !== '') {
                $tokenIss = $decoded->iss ?? null;
                if (! is_string($tokenIss) || rtrim($issuer, '/') !== rtrim($tokenIss, '/')) {
                    throw new ClerkTokenException(
                        'Invalid JWT issuer. Set CLERK_JWT_ISSUER to the exact `iss` claim from Clerk session tokens (Dashboard → API keys → JWT issuer).',
                        ClerkTokenException::CODE_JWT_ISSUER
                    );
                }
            }

            $expectedAud = config('clerk.jwt_audience');
            if (is_string($expectedAud) && $expectedAud !== '' && ! $this->audienceMatches($decoded, $expectedAud)) {
                throw new ClerkTokenException(
                    'Invalid JWT audience. Clerk session tokens use `aud` and/or `azp`; set CLERK_JWT_AUDIENCE to match one of those, or leave it unset to skip this check.',
                    ClerkTokenException::CODE_JWT_AUDIENCE
                );
            }

            return $decoded;
        } catch (ExpiredException) {
            throw new ClerkTokenException('Token expired.', ClerkTokenException::CODE_JWT_EXPIRED);
        } catch (SignatureInvalidException) {
            throw new ClerkTokenException(
                'Invalid token signature. Ensure CLERK_JWKS_URL matches the same Clerk instance as your frontend publishable key.',
                ClerkTokenException::CODE_JWT_SIGNATURE
            );
        } catch (UnexpectedValueException $e) {
            throw new ClerkTokenException('Invalid token.', ClerkTokenException::CODE_JWT_INVALID, $e);
        } catch (ClerkTokenException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::warning('clerk.jwt.decode_failed', ['message' => $e->getMessage()]);

            throw new ClerkTokenException(
                'Token verification failed.',
                ClerkTokenException::CODE_JWT_VERIFY_FAILED,
                $e
            );
        }
    }

    private function audienceMatches(stdClass $decoded, string $expected): bool
    {
        $tokenAud = $decoded->aud ?? null;
        if (is_string($tokenAud) && $tokenAud === $expected) {
            return true;
        }
        if (is_array($tokenAud) && in_array($expected, $tokenAud, true)) {
            return true;
        }

        $azp = $decoded->azp ?? null;

        return is_string($azp) && $azp === $expected;
    }
}
