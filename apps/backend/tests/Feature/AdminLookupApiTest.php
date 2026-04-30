<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminLookupApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_super_admin_can_search_companies_lookup(): void
    {
        $super = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $super->id)
            ->getJson('/api/admin/lookups/companies?q=Manchester');

        $res->assertOk()->assertJsonPath('success', true);
        $items = data_get($res->json(), 'data.items');
        self::assertIsArray($items);
        self::assertNotEmpty($items);
        self::assertArrayHasKey('id', $items[0]);
        self::assertArrayHasKey('label', $items[0]);
        self::assertArrayHasKey('description', $items[0]);
        self::assertArrayHasKey('meta', $items[0]);
    }

    public function test_route_manager_cannot_access_users_lookup(): void
    {
        $driver = User::query()->where('email', 'driver@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $driver->id)
            ->getJson('/api/admin/lookups/users?q=test')
            ->assertForbidden();
    }

    public function test_route_manager_can_search_routes_lookup(): void
    {
        $driver = User::query()->where('email', 'driver@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $driver->id)
            ->getJson('/api/admin/lookups/routes')
            ->assertOk()
            ->assertJsonPath('success', true);
    }
}
