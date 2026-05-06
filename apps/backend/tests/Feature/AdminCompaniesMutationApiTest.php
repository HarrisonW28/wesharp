<?php

namespace Tests\Feature;

use App\Enums\CompanyStatus;
use App\Enums\OrderStatus;
use App\Models\Booking;
use App\Models\Company;
use App\Models\Order;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminCompaniesMutationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_store_create_and_update_company(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $h = fn () => ['X-WeSharp-Test-User-Id' => (string) $operator->id];

        $create = $this->withHeaders($h())
            ->postJson('/api/admin/companies', [
                'name' => 'PHPUnit Fixture Kitchen',
                'city' => 'Manchester',
                'billing_email' => 'fixture.kitchen@test.wesharp',
            ]);

        $create->assertCreated()
            ->assertJsonPath('success', true);

        $id = $create->json('data.id');
        self::assertNotEmpty($id);

        self::assertDatabaseHas('companies', [
            'id' => $id,
            'name' => 'PHPUnit Fixture Kitchen',
            'city' => 'Manchester',
        ]);

        $update = $this->withHeaders($h())
            ->putJson('/api/admin/companies/'.$id, [
                'name' => 'PHPUnit Fixture Kitchen (HQ)',
                'billing_email' => 'hq.fixture.kitchen@test.wesharp',
            ]);

        $update->assertOk()
            ->assertJsonPath('data.name', 'PHPUnit Fixture Kitchen (HQ)');
    }

    public function test_soft_delete_company(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $company = Company::query()->create([
            'name' => 'Deletable Fixture Co',
            'slug' => 'deletable-fixture-co-'.bin2hex(random_bytes(4)),
            'company_status' => CompanyStatus::Lead,
            'city' => 'Liverpool',
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->delete('/api/admin/companies/'.$company->id)
            ->assertNoContent();

        self::assertSoftDeleted('companies', ['id' => $company->id]);
    }

    public function test_deleted_company_excluded_from_index_search(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $unique = 'UniqueGhostCo '.bin2hex(random_bytes(4));
        $company = Company::factory()->create([
            'name' => $unique,
            'slug' => 'ghost-'.bin2hex(random_bytes(4)),
            'company_status' => CompanyStatus::Lead,
        ]);

        $before = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->getJson('/api/admin/companies?q='.urlencode($unique));
        $before->assertOk();
        self::assertGreaterThanOrEqual(1, count($before->json('data.items')));

        $company->delete();

        $after = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->getJson('/api/admin/companies?q='.urlencode($unique));
        $after->assertOk();
        self::assertSame([], $after->json('data.items'));
    }

    public function test_deleted_company_surfaces_on_order_detail(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $company = Company::factory()->create([
            'company_status' => CompanyStatus::Lead,
            'slug' => 'order-soft-del-'.bin2hex(random_bytes(4)),
        ]);
        $booking = Booking::factory()->create(['company_id' => $company->id]);
        $order = Order::factory()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
            'order_status' => OrderStatus::Draft,
        ]);

        $company->delete();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->getJson('/api/admin/orders/'.$order->id)
            ->assertOk()
            ->assertJsonPath('data.company.is_deleted', true)
            ->assertJsonPath('data.company.name', $company->name);
    }
}
