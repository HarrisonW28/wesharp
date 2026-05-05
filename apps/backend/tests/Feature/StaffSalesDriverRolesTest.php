<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\OperationalRouteStatus;
use App\Models\OperationalRoute;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class StaffSalesDriverRolesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_sales_cannot_list_routes(): void
    {
        $sales = User::query()->where('email', 'sales@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $sales->id)
            ->getJson('/api/admin/routes')
            ->assertForbidden();
    }

    public function test_sales_can_create_company(): void
    {
        $sales = User::query()->where('email', 'sales@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $sales->id)
            ->postJson('/api/admin/companies', [
                'name' => 'Walk-in Customer Co',
                'city' => 'Manchester',
                'billing_email' => 'walkin@example.test',
            ])
            ->assertCreated();
    }

    public function test_driver_route_lookup_only_includes_assigned_routes(): void
    {
        $planner = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $field = User::query()->where('email', 'field@demo.wesharp.test')->firstOrFail();

        $mine = OperationalRoute::factory()->create([
            'driver_user_id' => $field->id,
            'route_status' => OperationalRouteStatus::Scheduled,
            'scheduled_date' => now()->toDateString(),
            'name' => 'Field run A',
        ]);
        OperationalRoute::factory()->create([
            'driver_user_id' => (int) $planner->id,
            'route_status' => OperationalRouteStatus::Scheduled,
            'scheduled_date' => now()->toDateString(),
            'name' => 'Other run B',
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $field->id)
            ->getJson('/api/admin/lookups/routes');

        $res->assertOk();
        $items = data_get($res->json(), 'data.items');
        self::assertIsArray($items);
        $ids = collect($items)->pluck('id')->all();
        self::assertContains((string) $mine->id, $ids);
        self::assertSame(1, count($ids));
    }

    public function test_driver_cannot_show_route_assigned_to_someone_else(): void
    {
        $planner = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $field = User::query()->where('email', 'field@demo.wesharp.test')->firstOrFail();

        $route = OperationalRoute::factory()->create([
            'driver_user_id' => (int) $planner->id,
            'route_status' => OperationalRouteStatus::Scheduled,
            'scheduled_date' => now()->toDateString(),
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $field->id)
            ->getJson('/api/admin/routes/'.$route->id)
            ->assertForbidden();
    }
}
