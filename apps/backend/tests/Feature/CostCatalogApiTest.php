<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CostCategory;
use App\Models\CostItem;
use App\Models\User;
use Database\Seeders\CostCatalogSeeder;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CostCatalogApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_cost_catalog_seeder_is_idempotent(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $first = CostItem::query()->count();
        $this->seed(CostCatalogSeeder::class);
        self::assertSame($first, CostItem::query()->count());
        self::assertSame(20, $first);
    }

    public function test_finance_can_list_and_filter_cost_items(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $finance = User::factory()->create(['role' => UserRole::Finance]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/cost-items?per_page=100');

        $res->assertOk();
        $names = collect($res->json('data.items'))->pluck('name')->all();
        self::assertContains('Tormek T-2', $names);
        self::assertContains('Petrol', $names);

        $weekly = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/cost-items?frequency=weekly');

        $weekly->assertOk();
        self::assertCount(1, $weekly->json('data.items'));
        self::assertSame('Petrol', $weekly->json('data.items.0.name'));
        self::assertSame(6000, $weekly->json('data.items.0.amount_pence'));

        $sim = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/cost-items?frequency=monthly')
            ->json('data.items');

        $mobile = collect($sim)->firstWhere('name', 'Mobile SIM');
        self::assertNotNull($mobile);
        self::assertSame(1000, $mobile['amount_pence']);
        self::assertSame('active', $mobile['status']);
    }

    public function test_customer_cannot_access_cost_catalogue(): void
    {
        $this->seed(WeSharpDemoSeeder::class);

        $portal = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $portal->id)
            ->getJson('/api/admin/cost-items')
            ->assertForbidden();
    }

    public function test_developer_can_view_but_not_mutate_cost_items(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $developer = User::factory()->create(['role' => UserRole::Developer]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $developer->id)
            ->getJson('/api/admin/cost-items')
            ->assertOk();

        $categoryId = (string) CostCategory::query()->where('slug', 'equipment')->firstOrFail()->id;

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $developer->id)
            ->postJson('/api/admin/cost-items', [
                'category_id' => $categoryId,
                'name' => 'Probe row',
                'amount_pence' => 100,
                'frequency' => 'one_time',
                'status' => 'to_order',
            ])
            ->assertForbidden();
    }

    public function test_finance_can_create_update_and_archive_cost_item(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $finance = User::factory()->create(['role' => UserRole::Finance]);

        $equipmentId = (string) CostCategory::query()->where('slug', 'equipment')->firstOrFail()->id;

        $created = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/cost-items', [
                'category_id' => $equipmentId,
                'name' => 'Manual test cost',
                'amount_pence' => 12345,
                'frequency' => 'monthly',
                'status' => 'active',
                'notes' => 'QA manual row',
            ]);

        $created->assertCreated();
        $id = $created->json('data.item.id');
        self::assertIsString($id);
        self::assertFalse($created->json('data.item.is_seeded'));
        self::assertSame('manual', $created->json('data.item.source'));

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->putJson('/api/admin/cost-items/'.$id, [
                'amount_pence' => 15000,
                'notes' => 'Updated',
            ])
            ->assertOk()
            ->assertJsonPath('data.item.amount_pence', 15000);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/cost-items/'.$id.'/archive')
            ->assertOk()
            ->assertJsonPath('data.item.status', 'archived');

        $listDefault = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/cost-items?q=Manual test cost');

        $listDefault->assertOk();
        self::assertCount(0, $listDefault->json('data.items'));

        $listArchived = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/cost-items?status=archived&q=Manual test cost');

        $listArchived->assertOk();
        self::assertCount(1, $listArchived->json('data.items'));
    }
}
