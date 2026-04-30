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

    /**
     * @throws ClerkTokenException
     */
    public function verify(string $jwtToken): stdClass
    {
        $jwksUrl = config('clerk.jwks_url');

        if ($jwksUrl === null || $jwksUrl === '') {
            throw new ClerkTokenException('Missing CLERK_JWKS_URL configuration.');
        }

        try {
            /** @var array<string, mixed>|null $jwks */
            $jwks = Cache::remember('clerk_jwks', self::JWKS_CACHE_SECONDS, static function () use ($jwksUrl): array {
                $response = Http::timeout(8)->acceptJson()->get($jwksUrl);

                if ($response->failed()) {
                    Log::warning('clerk.jwks.fetch_failed', ['status' => $response->status()]);

                    throw new ClerkTokenException('Unable to load Clerk JWKS.');
                }

                $data = $response->json();

                return is_array($data) ? $data : [];
            });

            /** @var array<string, Key> $keys */
            $keys = JWK::parseKeySet($jwks, 'RS256');

            $headers = new stdClass;

            $decoded = JWT::decode($jwtToken, $keys, $headers);

            $issuer = config('clerk.jwt_issuer');
            if (is_string($issuer) && $issuer !== '') {
                if (($decoded->iss ?? null) !== $issuer) {
                    throw new ClerkTokenException('Invalid JWT issuer.');
                }
            }

            $aud = config('clerk.jwt_audience');
            if (is_string($aud) && $aud !== '') {
                $tokenAud = $decoded->aud ?? null;
                $ok = is_string($tokenAud) && $tokenAud === $aud
                    || is_array($tokenAud) && in_array($aud, $tokenAud, true);
                if (! $ok) {
                    throw new ClerkTokenException('Invalid JWT audience.');
                }
            }

            return $decoded;
        } catch (ExpiredException) {
            throw new ClerkTokenException('Token expired.');
        } catch (SignatureInvalidException) {
            throw new ClerkTokenException('Invalid token signature.');
        } catch (UnexpectedValueException $e) {
            throw new ClerkTokenException('Invalid token.', previous: $e);
        } catch (ClerkTokenException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::warning('clerk.jwt.decode_failed', ['message' => $e->getMessage()]);

            throw new ClerkTokenException('Token verification failed.', previous: $e);
        }
    }
}
