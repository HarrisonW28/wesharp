<?php

declare(strict_types=1);

namespace App\Services\Clerk;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Creates Clerk email invitations (service token). Safe to call without secret — returns {@see ClerkInvitationDispatchResult::skipped}.
 */
final class ClerkInvitationsClient
{
    public function create(string $emailAddress): ClerkInvitationDispatchResult
    {
        $secret = config('clerk.secret');
        $base = rtrim((string) config('clerk.api_base'), '/');

        if (! is_string($secret) || $secret === '') {
            return ClerkInvitationDispatchResult::skipped('Clerk is not configured (missing CLERK_SECRET_KEY).');
        }

        $portalBase = rtrim((string) config('wesharp.customer_portal_base_url'), '/');
        $redirectUrl = $portalBase !== '' ? $portalBase.'/register' : null;

        try {
            $response = Http::timeout(12)
                ->withToken($secret)
                ->acceptJson()
                ->post($base.'/invitations', array_filter([
                    'email_address' => $emailAddress,
                    'redirect_url' => $redirectUrl,
                ], static fn (mixed $v): bool => $v !== null && $v !== ''));

            if ($response->failed()) {
                $snippet = Str::limit((string) $response->body(), 500);

                return ClerkInvitationDispatchResult::failed('Clerk HTTP '.$response->status().': '.$snippet);
            }

            $body = $response->json();
            $id = is_array($body) && isset($body['id']) && is_string($body['id']) ? $body['id'] : null;

            return ClerkInvitationDispatchResult::ok($id);
        } catch (Throwable $e) {
            Log::warning('clerk.invitation.exception', ['message' => $e->getMessage()]);

            return ClerkInvitationDispatchResult::failed($e->getMessage());
        }
    }
}
