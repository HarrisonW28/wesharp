<?php

declare(strict_types=1);

namespace App\Support\Audit;

/**
 * Recursively redacts sensitive keys and oversized blobs from audit payloads before API exposure.
 */
final class AuditPayloadRedactor
{
    private const SENSITIVE_KEY_FRAGMENTS = [
        'password',
        'secret',
        'token',
        'authorization',
        'cookie',
        'api_key',
        'apikey',
        'private_key',
        'cvv',
        'card_number',
        'payment_method_nonce',
        'clerk_session',
        'session_token',
        'bearer',
        'webhook_secret',
    ];

    private const MAX_STRING = 400;

    /**
     * @param  array<string, mixed>|null  $payload
     * @return array<string, mixed>
     */
    public static function redact(?array $payload): array
    {
        if ($payload === null || $payload === []) {
            return [];
        }

        return self::walk($payload);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private static function walk(array $data): array
    {
        $out = [];
        foreach ($data as $key => $value) {
            $k = (string) $key;
            if (self::isSensitiveKey($k)) {
                $out[$k] = '[redacted]';

                continue;
            }
            $out[$k] = self::redactValue($value);
        }

        return $out;
    }

    private static function isSensitiveKey(string $key): bool
    {
        $lower = strtolower($key);
        foreach (self::SENSITIVE_KEY_FRAGMENTS as $frag) {
            if (str_contains($lower, $frag)) {
                return true;
            }
        }

        return false;
    }

    private static function redactValue(mixed $value): mixed
    {
        if ($value === null || is_bool($value) || is_int($value) || is_float($value)) {
            return $value;
        }
        if (is_string($value)) {
            if (strlen($value) > self::MAX_STRING) {
                return substr($value, 0, self::MAX_STRING).'…';
            }

            return $value;
        }
        if ($value instanceof \Stringable) {
            $s = (string) $value;

            return strlen($s) > self::MAX_STRING ? substr($s, 0, self::MAX_STRING).'…' : $s;
        }
        if (is_array($value)) {
            /** @var array<string, mixed> $value */
            return self::walk($value);
        }

        return '[unsupported]';
    }
}
