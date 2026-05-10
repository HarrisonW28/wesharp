<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Company;
use App\Models\Consumable;
use App\Models\User;
use Database\Seeders\ConsumableCatalogSeeder;
use Database\Seeders\CostCatalogSeeder;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

/**
 * Sprint 23.7 — consolidated regression checks for cost seeding, imports, consumables, finance payloads, and permissions.
 */
final class Sprint23RegressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_consumable_catalog_seeder_is_idempotent(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $this->seed(ConsumableCatalogSeeder::class);
        $first = Consumable::query()->count();
        $this->seed(ConsumableCatalogSeeder::class);
        self::assertSame($first, Consumable::query()->count());
        self::assertSame(10, $first);
    }

    public function test_finance_can_list_cost_import_history_after_upload(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $finance = User::factory()->create(['role' => UserRole::Finance]);
        $hdr = ['X-WeSharp-Test-User-Id' => (string) $finance->id];

        $empty = $this->withHeaders($hdr)->getJson('/api/admin/cost-imports');
        $empty->assertOk()->assertJsonPath('success', true);
        self::assertSame(0, count($empty->json('data.batches') ?? []));

        $csv = <<<'CSV'
Tier,Item,Cost (£),Frequency,Status,Notes
,Sprint 23.7 History Row,10.00,monthly,to order,
CSV;
        $file = UploadedFile::fake()->createWithContent('regression.csv', $csv);
        $this->withHeaders($hdr)->post('/api/admin/cost-imports', ['file' => $file])->assertCreated();

        $listed = $this->withHeaders($hdr)->getJson('/api/admin/cost-imports');
        $listed->assertOk();
        $batches = $listed->json('data.batches');
        self::assertIsArray($batches);
        self::assertGreaterThanOrEqual(1, count($batches));
        self::assertNotEmpty($batches[0]['id'] ?? null);
    }

    public function test_demo_finance_dashboard_surfaces_cost_commitments_consumables_and_gbp_formatting(): void
    {
        $this->seed(WeSharpDemoSeeder::class);
        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/finance/dashboard');

        $res->assertOk()
            ->assertJsonPath('data.consumables_inventory.active_skus', 10)
            ->assertJsonPath('data.consumables_inventory.formatted_projected_restock', fn ($v) => is_string($v) && str_contains((string) $v, '£'));

        $cc = $res->json('data.cost_commitments');
        self::assertIsArray($cc);
        self::assertArrayHasKey('formatted_monthly_equivalent_active', $cc);
        self::assertIsString($cc['formatted_monthly_equivalent_active']);
        self::assertStringContainsString('£', $cc['formatted_monthly_equivalent_active']);
    }

    public function test_demo_company_detail_exposes_finance_intelligence_for_finance_role(): void
    {
        $this->seed(WeSharpDemoSeeder::class);
        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();
        $companyId = (string) Company::query()->firstOrFail()->id;

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/companies/'.$companyId);

        $res->assertOk();
        $fi = $res->json('data.finance_intelligence');
        self::assertIsArray($fi);
        self::assertArrayHasKey('formatted_total_paid', $fi);
        self::assertStringContainsString('£', (string) $fi['formatted_total_paid']);
    }
}
