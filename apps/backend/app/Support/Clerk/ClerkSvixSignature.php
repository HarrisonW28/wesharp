<?php

declare(strict_types=1);

namespace App\Support\Clerk;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Verifies Clerk webhook requests (Svix standard: svix-id, svix-timestamp, svix-signature).
 *
 * @see https://docs.svix.com/receiving/verifying-payloads/how
 */
final class ClerkSvixSignature
{
    private const TIMESTAMP_TOLERANCE_SECONDS = 300;

    public static function assertValid(
        string $webhookSigningSecret,
        string $rawBody,
        ?string $svixId,
        ?string $svixTimestamp,
        ?string $svixSignature,
    ): void {
        if ($webhookSigningSecret === '') {
            throw new HttpException(
                Response::HTTP_SERVICE_UNAVAILABLE,
                'Clerk webhook signing secret is not configured.'
            );
        }

        if ($svixId === null || $svixId === '' || $svixTimestamp === null || $svixTimestamp === ''
            || $svixSignature === null || $svixSignature === '') {
            throw new HttpException(Response::HTTP_BAD_REQUEST, 'Missing Svix signature headers.');
        }

        if (! str_starts_with($webhookSigningSecret, 'whsec_')) {
            throw new HttpException(
                Response::HTTP_SERVICE_UNAVAILABLE,
                'Invalid Clerk webhook secret format (expected whsec_… prefix).'
            );
        }

        $secret = base64_decode(substr($webhookSigningSecret, 6), true);
        if ($secret === false || $secret === '') {
            throw new HttpException(
                Response::HTTP_SERVICE_UNAVAILABLE,
                'Invalid Clerk webhook secret encoding.'
            );
        }

        $timestamp = (int) $svixTimestamp;
        if ($timestamp <= 0 || abs(time() - $timestamp) > self::TIMESTAMP_TOLERANCE_SECONDS) {
            throw new HttpException(Response::HTTP_BAD_REQUEST, 'Webhook timestamp outside tolerance.');
        }

        $signedContent = $svixId.'.'.$svixTimestamp.'.'.$rawBody;

        foreach (explode(' ', $svixSignature) as $sigPart) {
            $parts = explode(',', $sigPart, 2);
            if (($parts[0] ?? '') !== 'v1' || ! isset($parts[1])) {
                continue;
            }
            $decoded = base64_decode($parts[1], true);
            if ($decoded === false) {
                continue;
            }
            $expected = hash_hmac('sha256', $signedContent, $secret, true);
            if (hash_equals($expected, $decoded)) {
                return;
            }
        }

        throw new HttpException(Response::HTTP_BAD_REQUEST, 'Invalid webhook signature.');
    }
}
