<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Consumable;
use App\Models\User;
use Database\Seeders\ConsumableCatalogSeeder;
use Database\Seeders\CostCatalogSeeder;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ConsumableInventoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_can_list_consumables_after_seed(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $this->seed(ConsumableCatalogSeeder::class);

        self::assertSame(10, Consumable::query()->count());

        $finance = User::factory()->create(['role' => UserRole::Finance]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/consumables');

        $res->assertOk()
            ->assertJsonPath('success', true);

        $items = $res->json('data.items');
        self::assertCount(10, $items);
        $names = collect($items)->pluck('name')->all();
        self::assertContains('Diamond Wheel — Coarse', $names);

        $first = collect($items)->firstWhere('name', 'Diamond Wheel — Coarse');
        self::assertIsArray($first);
        self::assertArrayHasKey('is_low_stock', $first);
        self::assertArrayHasKey('formatted_projected_reorder_cost', $first);
    }

    public function test_low_stock_filter_returns_subset(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $this->seed(ConsumableCatalogSeeder::class);

        $finance = User::factory()->create(['role' => UserRole::Finance]);

        $all = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/consumables')
            ->json('data.items');

        $low = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/consumables?low_stock=1')
            ->json('data.items');

        self::assertLessThanOrEqual(count($all), count($low));
        foreach ($low as $row) {
            self::assertTrue((bool) ($row['is_low_stock'] ?? false), 'Filtered rows should be low stock.');
        }
    }

    public function test_finance_can_patch_stock_and_post_usage(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $this->seed(ConsumableCatalogSeeder::class);

        $finance = User::factory()->create(['role' => UserRole::Finance]);

        $consumableId = (string) Consumable::query()->firstOrFail()->id;

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->patchJson('/api/admin/consumables/'.$consumableId, [
                'stock_quantity' => 100,
                'reorder_threshold' => 10,
            ])
            ->assertOk()
            ->assertJsonPath('data.item.stock_quantity', '100.000');

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/consumables/'.$consumableId.'/usages', [
                'usage_date' => now()->toDateString(),
                'quantity_used' => 2.5,
                'notes' => 'QA usage log',
            ])
            ->assertCreated()
            ->assertJsonPath('data.item.stock_quantity', '97.500');
    }

    public function test_developer_can_list_but_not_mutate_consumables(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $this->seed(ConsumableCatalogSeeder::class);

        $developer = User::factory()->create(['role' => UserRole::Developer]);
        $consumableId = (string) Consumable::query()->firstOrFail()->id;

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $developer->id)
            ->getJson('/api/admin/consumables')
            ->assertOk();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $developer->id)
            ->patchJson('/api/admin/consumables/'.$consumableId, ['stock_quantity' => 1])
            ->assertForbidden();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $developer->id)
            ->postJson('/api/admin/consumables/'.$consumableId.'/usages', [
                'usage_date' => now()->toDateString(),
                'quantity_used' => 1,
            ])
            ->assertForbidden();
    }

    public function test_portal_user_forbidden(): void
    {
        $this->seed(WeSharpDemoSeeder::class);
        $portal = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $portal->id)
            ->getJson('/api/admin/consumables')
            ->assertForbidden();
    }
}
