<?php

namespace App\Support\Stripe;

use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Validates the Stripe-Signature header (v1 scheme) against the webhook signing secret.
 *
 * @see https://stripe.com/docs/webhooks/signatures
 */
final class StripeWebhookSignature
{
    private const int TOLERANCE_SECONDS = 300;

    public static function assertValid(string $webhookSecret, string $payload, ?string $signatureHeader): void
    {
        if ($webhookSecret === '') {
            throw new HttpException(503, 'Stripe webhook signing secret is not configured.');
        }

        if ($signatureHeader === null || $signatureHeader === '') {
            throw new HttpException(400, 'Missing Stripe-Signature header.');
        }

        $timestamp = self::parseTimestamp($signatureHeader);
        $signatures = self::parseV1Signatures($signatureHeader);

        if ($timestamp === null || $signatures === []) {
            throw new HttpException(400, 'Malformed Stripe-Signature header.');
        }

        if (abs(time() - $timestamp) > self::TOLERANCE_SECONDS) {
            throw new HttpException(400, 'Stripe webhook timestamp outside tolerance.');
        }

        $signedPayload = $timestamp.'.'.$payload;
        $expected = hash_hmac('sha256', $signedPayload, $webhookSecret);
        $ok = false;

        foreach ($signatures as $candidate) {
            if (hash_equals($expected, $candidate)) {
                $ok = true;

                break;
            }
        }

        if (! $ok) {
            throw new HttpException(400, 'Invalid Stripe webhook signature.');
        }
    }

    private static function parseTimestamp(string $signatureHeader): ?int
    {
        foreach (explode(',', $signatureHeader) as $part) {
            $part = trim($part);

            if (str_starts_with($part, 't=')) {
                $t = substr($part, 2);

                return ctype_digit($t) ? (int) $t : null;
            }
        }

        return null;
    }

    /** @return list<string> */
    private static function parseV1Signatures(string $signatureHeader): array
    {
        $out = [];

        foreach (explode(',', $signatureHeader) as $part) {
            $part = trim($part);

            if (! str_starts_with($part, 'v1=')) {
                continue;
            }

            $sig = substr($part, 3);

            if ($sig !== '') {
                $out[] = $sig;
            }
        }

        return $out;
    }
}
