<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminUserDirectoryApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_super_admin_can_list_users(): void
    {
        $super = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $super->id)->getJson('/api/admin/users?per_page=5');

        $res->assertOk()->assertJsonPath('success', true);
        /** @phpstan-ignore-next-line */
        self::assertIsArray(data_get($res->json(), 'data.items'));
        $first = data_get($res->json(), 'data.items.0');
        self::assertIsArray($first);
        self::assertArrayHasKey('role_bucket', $first);
        self::assertArrayNotHasKey('clerk_user_id', $first);
    }

    public function test_route_manager_cannot_access_user_directory(): void
    {
        $driver = User::query()->where('email', 'driver@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $driver->id)->getJson('/api/admin/users')->assertForbidden();
    }

    public function test_finance_cannot_access_user_directory(): void
    {
        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)->getJson('/api/admin/users')->assertForbidden();
    }

    public function test_super_admin_can_show_user_detail(): void
    {
        $super = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $target = User::query()->where('email', 'driver@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $super->id)
            ->getJson('/api/admin/users/'.$target->id)
            ->assertOk()
            ->assertJsonPath('data.email', 'driver@demo.wesharp.test')
            ->assertJsonPath('data.admin_metadata.clerk_user_id', $target->clerk_user_id);
    }

    public function test_cannot_demote_last_super_admin(): void
    {
        $super = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $super->id)
            ->putJson('/api/admin/users/'.$super->id, ['role' => UserRole::Admin->value])
            ->assertStatus(422);
    }

    public function test_can_demote_super_admin_when_another_super_exists(): void
    {
        $super = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $other = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Active,
            'email' => 'other-super@demo.wesharp.test',
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $super->id)
            ->putJson('/api/admin/users/'.$super->id, [
                'role' => UserRole::Admin->value,
                'confirm_super_demotion' => 'REMOVE_MY_SUPER_ACCESS',
            ])
            ->assertOk()
            ->assertJsonPath('data.role', UserRole::Admin->value);

        self::assertSame(UserRole::SuperAdmin, $other->fresh()->resolvedRole());
    }

    public function test_cannot_suspend_last_super_admin(): void
    {
        $super = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $other = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Suspended,
        ]);

        self::assertGreaterThan(0, $other->id);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $super->id)
            ->postJson('/api/admin/users/'.$super->id.'/deactivate')
            ->assertStatus(422);
    }

    public function test_invite_placeholder_records_audit(): void
    {
        $super = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $target = User::query()->where('email', 'driver@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $super->id)
            ->postJson('/api/admin/users/'.$target->id.'/invite-placeholder')
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('audit_logs', [
            'auditable_type' => User::class,
            'auditable_id' => (string) $target->id,
            'action' => 'user.invite_resend_placeholder',
        ]);
    }
}
