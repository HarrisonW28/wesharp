<?php

namespace App\Services\Clerk;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use App\Services\Crm\CustomerPortalInviteFulfillment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use stdClass;
use Throwable;

/**
 * Maps Clerk `sub` claims to local {@see User} rows and keeps profile fields in sync on first login.
 * Webhook-driven updates use {@see self::applyClerkWebhook()} with the same merge rules (internal roles preserved).
 */
final class ClerkUserSynchronizer
{
    public function __construct(
        private readonly ClerkJwtVerifier $verifier,
    ) {}

    /**
     * @throws ClerkTokenException
     */
    public function userFromBearer(?string $authorizationHeader): User
    {
        if ($authorizationHeader === null || $authorizationHeader === '' || ! Str::startsWith($authorizationHeader, 'Bearer ')) {
            throw new ClerkTokenException(
                'Missing Bearer token.',
                ClerkTokenException::CODE_MISSING_BEARER
            );
        }

        $jwt = trim(Str::after($authorizationHeader, 'Bearer'));

        if ($jwt === '') {
            throw new ClerkTokenException(
                'Missing Bearer token.',
                ClerkTokenException::CODE_MISSING_BEARER
            );
        }

        $decoded = $this->verifier->verify($jwt);

        $sub = is_string($decoded->sub ?? null) ? $decoded->sub : null;
        if ($sub === null || $sub === '') {
            throw new ClerkTokenException(
                'Invalid subject claim.',
                ClerkTokenException::CODE_INVALID_SUBJECT
            );
        }

        return $this->syncLocalUser($sub, $decoded);
    }

    /**
     * Apply Clerk `user.*` webhook payloads after Svix verification and idempotency checks.
     * Unknown event types are ignored. Does not promote users to staff from Clerk metadata.
     *
     * @param  array<string, mixed>  $data  The Clerk `data` object from the webhook body.
     */
    public function applyClerkWebhook(string $eventType, array $data): void
    {
        match ($eventType) {
            'user.created', 'user.updated' => $this->upsertUserFromClerkUserResource($data),
            'user.deleted' => $this->suspendLocalUserFromClerkDeletion($data),
            default => null,
        };
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function suspendLocalUserFromClerkDeletion(array $data): void
    {
        $id = isset($data['id']) && is_string($data['id']) ? $data['id'] : null;
        if ($id === null || $id === '') {
            return;
        }

        $user = User::query()->where('clerk_user_id', $id)->first();
        if ($user === null) {
            return;
        }

        $user->status = UserStatus::Suspended;
        $user->save();
    }

    /**
     * @param  array<string, mixed>  $u  Clerk User JSON resource
     */
    private function upsertUserFromClerkUserResource(array $u): void
    {
        $profile = $this->profileArrayFromClerkUserResource($u);
        if ($profile === null) {
            throw new \InvalidArgumentException('Clerk user payload missing id or resolvable email.');
        }

        $clerkUserId = $profile['clerk_user_id'];
        $existingByClerk = User::query()->where('clerk_user_id', $clerkUserId)->first();
        if ($existingByClerk !== null) {
            $this->mergeProfile($existingByClerk, $profile);
            CustomerPortalInviteFulfillment::tryFulfill($existingByClerk->fresh());

            return;
        }

        $byEmail = User::query()->where('email', $profile['email'])->first();
        if ($byEmail !== null) {
            $this->mergeProfile($byEmail, $profile);
            CustomerPortalInviteFulfillment::tryFulfill($byEmail->fresh());

            return;
        }

        $created = User::query()->create([
            'clerk_user_id' => $clerkUserId,
            'name' => $profile['name'],
            'email' => $profile['email'],
            'password' => null,
            'role' => UserRole::tryFrom((string) config('clerk.default_role')) ?? UserRole::CustomerStaff,
            'status' => UserStatus::tryFrom((string) config('clerk.default_status')) ?? UserStatus::Active,
            'company_id' => null,
        ]);
        CustomerPortalInviteFulfillment::tryFulfill($created);
    }

    /**
     * @param  array<string, mixed>  $u
     * @return array{clerk_user_id: string, name: string, email: string}|null
     */
    private function profileArrayFromClerkUserResource(array $u): ?array
    {
        $id = isset($u['id']) && is_string($u['id']) ? $u['id'] : null;
        if ($id === null || $id === '') {
            return null;
        }

        $email = $this->primaryEmailFromClerkUserArray($u);
        if ($email === null || $email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return null;
        }
        $email = strtolower($email);

        $name = $this->displayNameFromClerkUserArray($u) ?? 'WeSharp user';

        return [
            'clerk_user_id' => $id,
            'email' => $email,
            'name' => $name,
        ];
    }

    /**
     * @param  array<string, mixed>  $u
     */
    private function primaryEmailFromClerkUserArray(array $u): ?string
    {
        $primaryId = $u['primary_email_address_id'] ?? null;
        $addresses = $u['email_addresses'] ?? [];
        if (! is_array($addresses)) {
            return null;
        }

        foreach ($addresses as $row) {
            if (! is_array($row) || empty($row['email_address']) || ! is_string($row['email_address'])) {
                continue;
            }
            if (is_string($primaryId) && $primaryId !== '' && isset($row['id']) && (string) $row['id'] === $primaryId) {
                return (string) $row['email_address'];
            }
        }

        foreach ($addresses as $row) {
            if (is_array($row) && ! empty($row['email_address']) && is_string($row['email_address'])) {
                return (string) $row['email_address'];
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $u
     */
    private function displayNameFromClerkUserArray(array $u): ?string
    {
        $first = isset($u['first_name']) && is_string($u['first_name']) ? $u['first_name'] : '';
        $last = isset($u['last_name']) && is_string($u['last_name']) ? $u['last_name'] : '';
        $full = trim($first.' '.$last);
        if ($full !== '') {
            return $full;
        }

        if (isset($u['username']) && is_string($u['username']) && $u['username'] !== '') {
            return $u['username'];
        }

        return null;
    }

    private function syncLocalUser(string $clerkUserId, stdClass $decoded): User
    {
        $profile = $this->hydrateProfileFromClerkApi($clerkUserId, $decoded);

        /** @var User|null $existingByClerk */
        $existingByClerk = User::query()->where('clerk_user_id', $clerkUserId)->first();

        if ($existingByClerk) {
            $user = $this->mergeProfile($existingByClerk, $profile);
            CustomerPortalInviteFulfillment::tryFulfill($user);

            return $user;
        }

        $byEmail = User::query()->where('email', $profile['email'])->first();

        if ($byEmail !== null) {
            $user = $this->mergeProfile($byEmail, array_merge($profile, [
                'clerk_user_id' => $clerkUserId,
            ]));
            CustomerPortalInviteFulfillment::tryFulfill($user);

            return $user;
        }

        $created = User::query()->create([
            'clerk_user_id' => $clerkUserId,
            'name' => $profile['name'],
            'email' => $profile['email'],
            'password' => null,
            'role' => UserRole::tryFrom((string) config('clerk.default_role')) ?? UserRole::CustomerStaff,
            'status' => UserStatus::tryFrom((string) config('clerk.default_status')) ?? UserStatus::Active,
            'company_id' => null,
        ]);
        CustomerPortalInviteFulfillment::tryFulfill($created);

        return $created;
    }

    /**
     * @return array{name:string, email:string}
     */
    private function hydrateProfileFromClerkApi(string $clerkUserId, stdClass $decoded): array
    {
        $name = $this->safeString($decoded->name ?? null)
            ?? $this->safeString($decoded->given_name ?? null)
            ?? 'WeSharp user';

        $email = $this->extractEmailFromClaims($decoded)
            ?? $this->fetchEmailFromClerkRestApi($clerkUserId);

        if ($email === null) {
            throw new ClerkTokenException(
                'Unable to resolve email for Clerk user. Ensure CLERK_SECRET_KEY is set for the same Clerk instance and the user has a primary email in Clerk.',
                ClerkTokenException::CODE_EMAIL_UNRESOLVABLE
            );
        }

        $resolvedName = $this->fetchNameFromClerkRestApi($clerkUserId) ?? $name;

        return [
            'email' => strtolower($email),
            'name' => $resolvedName,
        ];
    }

    /**
     * Sync identity fields only. Role, company_id, and status are database-authoritative — never overwrite
     * an existing staff assignment (e.g. super_admin) from Clerk on subsequent logins.
     */
    private function mergeProfile(User $user, array $incoming): User
    {
        $dirty = [];

        foreach (['clerk_user_id', 'email', 'name'] as $key) {
            if (array_key_exists($key, $incoming) && $incoming[$key] !== null && $incoming[$key] !== $user->{$key}) {
                $dirty[$key] = $incoming[$key];
            }
        }

        if ($dirty !== []) {
            $user->fill($dirty);
            $user->save();
        }

        return $user->refresh();
    }

    private function safeString(mixed $value): ?string
    {
        if (is_string($value) && $value !== '') {
            return $value;
        }

        return null;
    }

    private function extractEmailFromClaims(stdClass $decoded): ?string
    {
        foreach (['email', 'primary_email_address', 'preferred_username'] as $key) {
            $candidate = $this->safeString($decoded->{$key} ?? null);

            if ($candidate !== null && filter_var($candidate, FILTER_VALIDATE_EMAIL)) {
                return $candidate;
            }
        }

        return null;
    }

    private function fetchEmailFromClerkRestApi(string $clerkUserId): ?string
    {
        $payload = $this->clerkUserPayload($clerkUserId);

        if ($payload === null) {
            return null;
        }

        foreach ($payload['email_addresses'] ?? [] as $row) {
            if (is_array($row) && ! empty($row['email_address'])) {
                return (string) $row['email_address'];
            }
        }

        return null;
    }

    private function fetchNameFromClerkRestApi(string $clerkUserId): ?string
    {
        $payload = $this->clerkUserPayload($clerkUserId);

        if ($payload === null) {
            return null;
        }

        $first = $payload['first_name'] ?? '';
        $last = $payload['last_name'] ?? '';
        $full = trim($first.' '.$last);

        if ($full !== '') {
            return $full;
        }

        if (! empty($payload['username']) && is_string($payload['username'])) {
            return $payload['username'];
        }

        return null;
    }

    /** @return array<string, mixed>|null */
    private function clerkUserPayload(string $clerkUserId): ?array
    {
        $secret = config('clerk.secret');
        $base = rtrim((string) config('clerk.api_base'), '/');

        if ($secret === null || $secret === '') {
            Log::warning('clerk.user_sync.missing_secret');

            return null;
        }

        try {
            $response = Http::timeout(8)
                ->withToken($secret)
                ->acceptJson()
                ->get($base.'/users/'.$clerkUserId);

            if ($response->failed()) {
                Log::warning('clerk.user_sync.fetch_failed', ['status' => $response->status()]);

                return null;
            }

            $body = $response->json();

            return is_array($body) ? $body : null;
        } catch (Throwable $e) {
            Log::warning('clerk.user_sync.exception', ['message' => $e->getMessage()]);

            return null;
        }
    }
}
