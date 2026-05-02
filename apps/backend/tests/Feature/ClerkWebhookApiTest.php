<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

final class ClerkWebhookApiTest extends TestCase
{
    use RefreshDatabase;

    /** @return non-empty-string */
    private function sampleWhsecSecret(): string
    {
        return 'whsec_'.base64_encode('clerk-test-signing-secret-32b!');
    }

    /**
     * @param  non-empty-string  $rawJson
     * @return array<string, string>
     */
    private function clerkWebhookServer(string $rawJson, string $svixId, int $timestamp, string $whsecSecret): array
    {
        $keyMaterial = base64_decode(substr($whsecSecret, 6), true);
        self::assertNotFalse($keyMaterial);
        self::assertNotSame('', $keyMaterial);
        $signed = $svixId.'.'.$timestamp.'.'.$rawJson;
        $sig = base64_encode(hash_hmac('sha256', $signed, $keyMaterial, true));

        return [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_SVIX_ID' => $svixId,
            'HTTP_SVIX_TIMESTAMP' => (string) $timestamp,
            'HTTP_SVIX_SIGNATURE' => 'v1,'.$sig,
        ];
    }

    /**
     * @param  non-empty-string  $rawJson
     */
    private function postClerkWebhook(string $rawJson, string $svixId, int $timestamp, string $whsecSecret): TestResponse
    {
        return $this->call(
            'POST',
            '/api/webhooks/clerk',
            [],
            [],
            [],
            $this->clerkWebhookServer($rawJson, $svixId, $timestamp, $whsecSecret),
            $rawJson
        );
    }

    public function test_rejects_when_webhook_secret_missing(): void
    {
        Config::set('clerk.webhook_signing_secret', '');

        $raw = '{"type":"user.created","data":{}}';
        $response = $this->call(
            'POST',
            '/api/webhooks/clerk',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_SVIX_ID' => 'msg_1',
                'HTTP_SVIX_TIMESTAMP' => (string) time(),
                'HTTP_SVIX_SIGNATURE' => 'v1,abc',
            ],
            $raw
        );

        $response->assertStatus(503)->assertJsonPath('error.code', 'webhook_not_configured');
    }

    public function test_rejects_when_webhook_secret_missing_without_echoing_config_hints_when_not_debugging(): void
    {
        Config::set('clerk.webhook_signing_secret', '');
        Config::set('app.debug', false);

        $raw = '{"type":"user.created","data":{}}';
        $response = $this->call(
            'POST',
            '/api/webhooks/clerk',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_SVIX_ID' => 'msg_1',
                'HTTP_SVIX_TIMESTAMP' => (string) time(),
                'HTTP_SVIX_SIGNATURE' => 'v1,abc',
            ],
            $raw
        );

        $response->assertStatus(503)->assertJsonPath('error.code', 'webhook_not_configured');

        $message = $response->json('error.message');
        self::assertIsString($message);
        self::assertStringNotContainsStringIgnoringCase('secret', $message);
        self::assertStringNotContainsStringIgnoringCase('whsec', $message);
    }

    public function test_rejects_invalid_signature(): void
    {
        $whsec = $this->sampleWhsecSecret();
        Config::set('clerk.webhook_signing_secret', $whsec);

        $raw = '{"type":"user.created","data":{"id":"user_x"}}';
        $ts = time();

        $response = $this->call(
            'POST',
            '/api/webhooks/clerk',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_SVIX_ID' => 'msg_bad_sig',
                'HTTP_SVIX_TIMESTAMP' => (string) $ts,
                'HTTP_SVIX_SIGNATURE' => 'v1,'.base64_encode(hash_hmac('sha256', 'wrong', 'wrong', true)),
            ],
            $raw
        );

        $response->assertStatus(400)->assertJsonPath('error.code', 'webhook_bad_request');
    }

    public function test_user_created_persists_user_and_inbox(): void
    {
        $whsec = $this->sampleWhsecSecret();
        Config::set('clerk.webhook_signing_secret', $whsec);

        $payload = [
            'type' => 'user.created',
            'data' => [
                'id' => 'user_clerk_new_1',
                'first_name' => 'Ada',
                'last_name' => 'Lovelace',
                'primary_email_address_id' => 'ea_1',
                'email_addresses' => [
                    ['id' => 'ea_1', 'email_address' => 'ada@example.test'],
                ],
            ],
        ];
        $raw = json_encode($payload, JSON_THROW_ON_ERROR);
        $svixId = 'msg_create_1';

        $this->postClerkWebhook($raw, $svixId, time(), $whsec)->assertOk()->assertJson(['received' => true]);

        self::assertTrue(User::query()->where('clerk_user_id', 'user_clerk_new_1')->where('email', 'ada@example.test')->exists());
        self::assertSame(1, (int) DB::table('webhook_inbox')->where('provider', 'clerk')->where('external_id', $svixId)->count());
        self::assertSame('processed', (string) DB::table('webhook_inbox')->where('external_id', $svixId)->value('processing_state'));
    }

    public function test_duplicate_svix_delivery_is_idempotent(): void
    {
        $whsec = $this->sampleWhsecSecret();
        Config::set('clerk.webhook_signing_secret', $whsec);

        $payload = [
            'type' => 'user.created',
            'data' => [
                'id' => 'user_clerk_dup_1',
                'first_name' => 'First',
                'last_name' => 'Name',
                'primary_email_address_id' => 'ea_d1',
                'email_addresses' => [
                    ['id' => 'ea_d1', 'email_address' => 'dup@example.test'],
                ],
            ],
        ];
        $raw = json_encode($payload, JSON_THROW_ON_ERROR);
        $svixId = 'msg_dup_same';
        $ts = time();

        $this->postClerkWebhook($raw, $svixId, $ts, $whsec)->assertOk();
        $this->postClerkWebhook($raw, $svixId, $ts, $whsec)->assertOk();

        self::assertSame(1, User::query()->where('clerk_user_id', 'user_clerk_dup_1')->count());
        self::assertSame(1, (int) DB::table('webhook_inbox')->where('external_id', $svixId)->count());
    }

    public function test_user_updated_does_not_overwrite_internal_role(): void
    {
        $whsec = $this->sampleWhsecSecret();
        Config::set('clerk.webhook_signing_secret', $whsec);

        $user = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Active,
            'company_id' => null,
            'clerk_user_id' => 'user_staff_clerk',
            'email' => 'boss@example.test',
            'name' => 'Old Name',
        ]);

        $payload = [
            'type' => 'user.updated',
            'data' => [
                'id' => 'user_staff_clerk',
                'first_name' => 'New',
                'last_name' => 'Boss',
                'primary_email_address_id' => 'ea_b',
                'email_addresses' => [
                    ['id' => 'ea_b', 'email_address' => 'boss@example.test'],
                ],
            ],
        ];
        $raw = json_encode($payload, JSON_THROW_ON_ERROR);

        $this->postClerkWebhook($raw, 'msg_upd_1', time(), $whsec)->assertOk();

        $user->refresh();
        self::assertSame(UserRole::SuperAdmin, $user->role);
        self::assertSame('New Boss', $user->name);
    }

    public function test_user_deleted_suspends_local_user(): void
    {
        $whsec = $this->sampleWhsecSecret();
        Config::set('clerk.webhook_signing_secret', $whsec);

        $user = User::factory()->create([
            'role' => UserRole::CustomerStaff,
            'status' => UserStatus::Active,
            'clerk_user_id' => 'user_to_delete',
            'email' => 'gone@example.test',
        ]);

        $payload = [
            'type' => 'user.deleted',
            'data' => ['id' => 'user_to_delete'],
        ];
        $raw = json_encode($payload, JSON_THROW_ON_ERROR);

        $this->postClerkWebhook($raw, 'msg_del_1', time(), $whsec)->assertOk();

        $user->refresh();
        self::assertSame(UserStatus::Suspended, $user->status);
    }

    public function test_customer_cannot_list_webhook_inbox(): void
    {
        $company = Company::factory()->create();
        $customer = User::factory()->create([
            'role' => UserRole::CustomerOwner,
            'status' => UserStatus::Active,
            'company_id' => $company->id,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $customer->id)
            ->getJson('/api/admin/webhooks/inbox')
            ->assertForbidden();
    }

    public function test_business_admin_cannot_list_webhook_inbox(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::Admin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $admin->id)
            ->getJson('/api/admin/webhooks/inbox')
            ->assertForbidden();
    }

    public function test_developer_lists_webhook_inbox(): void
    {
        $dev = User::factory()->create([
            'role' => UserRole::Developer,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $now = now();
        DB::table('webhook_inbox')->insert([
            'provider' => 'clerk',
            'external_id' => 'msg_dev_1',
            'event_type' => 'user.created',
            'processing_state' => 'processed',
            'last_error' => null,
            'received_at' => $now,
            'processed_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $dev->id)
            ->getJson('/api/admin/webhooks/inbox')
            ->assertOk();
    }

    public function test_staff_with_system_tools_permission_lists_inbox_metadata(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $now = now();
        DB::table('webhook_inbox')->insert([
            'provider' => 'clerk',
            'external_id' => 'msg_list_1',
            'event_type' => 'user.created',
            'processing_state' => 'processed',
            'last_error' => null,
            'received_at' => $now,
            'processed_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $response = $this->withHeader('X-WeSharp-Test-User-Id', (string) $admin->id)
            ->getJson('/api/admin/webhooks/inbox');

        $response->assertOk();
        $items = $response->json('data.items');
        self::assertIsArray($items);
        self::assertNotEmpty($items);
        $first = $items[0];
        self::assertArrayHasKey('provider', $first);
        self::assertArrayHasKey('external_id', $first);
        self::assertArrayNotHasKey('payload', $first);
    }
}
