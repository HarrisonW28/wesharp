<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminDashboardSearchApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_requires_two_character_query(): void
    {
        $super = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $super->id)
            ->getJson('/api/admin/dashboard-search?q=a')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.items', []);
    }

    public function test_super_admin_search_returns_grouped_structure(): void
    {
        $super = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $super->id)
            ->getJson('/api/admin/dashboard-search?q=Manchester');

        $res->assertOk()->assertJsonPath('success', true);
        $items = data_get($res->json(), 'data.items');
        self::assertIsArray($items);
        if ($items !== []) {
            self::assertArrayHasKey('kind', $items[0]);
            self::assertArrayHasKey('path', $items[0]);
            self::assertArrayHasKey('label', $items[0]);
        }
    }
}
