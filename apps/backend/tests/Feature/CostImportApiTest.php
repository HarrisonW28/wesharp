<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CostItem;
use App\Models\User;
use Database\Seeders\CostCatalogSeeder;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

final class CostImportApiTest extends TestCase
{
    use RefreshDatabase;

    private function csvFixture(): string
    {
        return <<<'CSV'
Tier,Item,Cost (£),Frequency,Status,Notes
,Grand Total,999,monthly,to order,
,Import Unique XYZ,50.00,monthly,to order,
CSV;
    }

    public function test_finance_upload_preview_commit_and_reimport_updates(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $finance = User::factory()->create(['role' => UserRole::Finance]);

        $hdr = ['X-WeSharp-Test-User-Id' => (string) $finance->id];

        $file = UploadedFile::fake()->createWithContent('cost_plan.csv', $this->csvFixture());
        $up = $this->withHeaders($hdr)->post('/api/admin/cost-imports', ['file' => $file]);

        $up->assertCreated();
        $up->assertJsonPath('data.batch.status', 'preview_ready');
        $batchId = $up->json('data.batch.id');
        self::assertIsString($batchId);
        self::assertGreaterThanOrEqual(2, $up->json('data.batch.rows_detected'));

        $show = $this->withHeaders($hdr)->getJson("/api/admin/cost-imports/{$batchId}");
        $show->assertOk();
        $rows = $show->json('data.rows');
        self::assertIsArray($rows);
        $actions = collect($rows)->pluck('preview_action')->all();
        self::assertContains('would_skip', $actions);
        self::assertContains('would_create', $actions);

        $commit = $this->withHeaders($hdr)->postJson("/api/admin/cost-imports/{$batchId}/commit", []);
        $commit->assertOk();
        $commit->assertJsonPath('data.batch.status', 'committed');
        $commit->assertJsonPath('data.batch.rows_created', 1);
        $commit->assertJsonPath('data.batch.rows_skipped', 1);

        $item = CostItem::query()->where('name', 'Import Unique XYZ')->first();
        self::assertNotNull($item);
        self::assertSame('import', $item->source);
        self::assertSame(5000, $item->amount_pence);

        $file2 = UploadedFile::fake()->createWithContent(
            'cost_plan.csv',
            str_replace('50.00', '75.00', $this->csvFixture()),
        );
        $up2 = $this->withHeaders($hdr)->post('/api/admin/cost-imports', ['file' => $file2]);
        $up2->assertCreated();
        $batchId2 = $up2->json('data.batch.id');
        $show2 = $this->withHeaders($hdr)->getJson("/api/admin/cost-imports/{$batchId2}");
        $show2->assertOk();
        $mapped = collect($show2->json('data.rows'))->firstWhere('preview_action', 'would_update');
        self::assertNotNull($mapped);
        self::assertSame(7500, $mapped['mapped_data']['amount_pence']);

        $this->withHeaders($hdr)->postJson("/api/admin/cost-imports/{$batchId2}/commit", [])->assertOk();

        $item->refresh();
        self::assertSame(7500, $item->amount_pence);
    }

    public function test_import_maps_category_supplier_dates_and_weekly_equivalents(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $finance = User::factory()->create(['role' => UserRole::Finance]);
        $hdr = ['X-WeSharp-Test-User-Id' => (string) $finance->id];

        $csv = <<<'CSV'
Tier,Item,Cost (£),Frequency,Status,Category,Supplier,Next due,Renewal,Payment method,Cancellable
,Imported Weekly Line,60.00,weekly,active,Route and vehicle,Shell PLC,2026-06-01,2027-01-01,Company card,no
CSV;

        $file = UploadedFile::fake()->createWithContent('cost_plan.csv', $csv);
        $batchId = $this->withHeaders($hdr)->post('/api/admin/cost-imports', ['file' => $file])->json('data.batch.id');

        $this->withHeaders($hdr)->postJson("/api/admin/cost-imports/{$batchId}/commit", [])->assertOk();

        $item = CostItem::query()->with('category')->where('name', 'Imported Weekly Line')->firstOrFail();
        self::assertSame('route_and_vehicle', $item->category->slug);
        self::assertSame('Shell PLC', $item->supplier_name);
        self::assertSame(25980, $item->monthly_equivalent_pence);
        self::assertSame(312000, $item->annual_equivalent_pence);
        self::assertSame('2026-06-01', $item->next_due_on?->toDateString());
        self::assertSame('2027-01-01', $item->renews_on?->toDateString());
        self::assertSame('Company card', $item->payment_method_note);
        self::assertFalse($item->commitment_cancellable);
    }

    public function test_customer_cannot_access_cost_import_api(): void
    {
        $this->seed(WeSharpDemoSeeder::class);
        $portal = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();

        $hdr = ['X-WeSharp-Test-User-Id' => (string) $portal->id];
        $file = UploadedFile::fake()->createWithContent('cost_plan.csv', $this->csvFixture());

        $this->withHeaders($hdr)->post('/api/admin/cost-imports', ['file' => $file])->assertForbidden();
        $this->withHeaders($hdr)->getJson('/api/admin/cost-imports')->assertForbidden();
    }

    public function test_developer_can_list_and_preview_but_not_upload_or_commit(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $developer = User::factory()->create(['role' => UserRole::Developer]);
        $finance = User::factory()->create(['role' => UserRole::Finance]);

        $file = UploadedFile::fake()->createWithContent('cost_plan.csv', $this->csvFixture());
        $batchId = $this->withHeaders(['X-WeSharp-Test-User-Id' => (string) $finance->id])
            ->post('/api/admin/cost-imports', ['file' => $file])
            ->json('data.batch.id');

        $hdr = ['X-WeSharp-Test-User-Id' => (string) $developer->id];
        $this->withHeaders($hdr)->getJson('/api/admin/cost-imports')->assertOk();
        $this->withHeaders($hdr)->getJson("/api/admin/cost-imports/{$batchId}")->assertOk();

        $this->withHeaders($hdr)->post('/api/admin/cost-imports', ['file' => $file])->assertForbidden();
        $this->withHeaders($hdr)->postJson("/api/admin/cost-imports/{$batchId}/commit", [])->assertForbidden();
    }

    public function test_commit_rejected_when_batch_not_preview_ready(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $finance = User::factory()->create(['role' => UserRole::Finance]);
        $hdr = ['X-WeSharp-Test-User-Id' => (string) $finance->id];

        $file = UploadedFile::fake()->createWithContent('bad.csv', "x,y\n1,2\n");
        $up = $this->withHeaders($hdr)->post('/api/admin/cost-imports', ['file' => $file]);
        $up->assertCreated();
        $up->assertJsonPath('data.batch.status', 'failed');

        $batchId = $up->json('data.batch.id');
        $this->withHeaders($hdr)->postJson("/api/admin/cost-imports/{$batchId}/commit", [])->assertStatus(422);
    }
}
