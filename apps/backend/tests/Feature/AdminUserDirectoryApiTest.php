<?php

declare(strict_types=1);

namespace Tests\Feature;

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
    }

    public function test_route_manager_cannot_access_user_directory(): void
    {
        $driver = User::query()->where('email', 'driver@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $driver->id)->getJson('/api/admin/users')->assertForbidden();
    }

    public function test_super_admin_can_show_user_detail(): void
    {
        $super = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $target = User::query()->where('email', 'driver@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $super->id)
            ->getJson('/api/admin/users/'.$target->id)
            ->assertOk()
            ->assertJsonPath('data.email', 'driver@demo.wesharp.test');
    }
}
