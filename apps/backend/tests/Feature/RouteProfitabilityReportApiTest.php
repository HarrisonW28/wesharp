<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\CostAllocationMethod;
use App\Enums\CostAllocationTargetType;
use App\Enums\OperationalRouteStatus;
use App\Enums\OrderStatus;
use App\Enums\RouteStopStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\CostAllocation;
use App\Models\CostItem;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\RouteStop;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\CostCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class RouteProfitabilityReportApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_driver_cannot_access_route_profitability_report(): void
    {
        $driver = User::factory()->create(['role' => UserRole::Driver]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $driver->id)
            ->getJson('/api/admin/reports/route-profitability')
            ->assertForbidden();
    }

    public function test_sales_cannot_access_route_profitability_report(): void
    {
        $sales = User::factory()->create(['role' => UserRole::Sales]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $sales->id)
            ->getJson('/api/admin/reports/route-profitability')
            ->assertForbidden();
    }

    public function test_route_manager_can_access_route_profitability_report(): void
    {
        $user = User::factory()->create(['role' => UserRole::RouteManager]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/reports/route-profitability?date_from=2026-03-01&date_to=2026-03-31')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.kpis.routes_count', 0)
            ->assertJsonStructure([
                'data' => [
                    'definitions',
                    'filters_applied',
                    'sales_route',
                    'kpis',
                    'drivers',
                    'routes',
                    'disclaimer',
                ],
            ]);
    }

    public function test_finance_can_access_route_profitability_but_not_legacy_operations_routes_report(): void
    {
        $finance = User::factory()->create(['role' => UserRole::Finance]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/reports/routes')
            ->assertForbidden();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/reports/route-profitability?date_from=2026-03-01&date_to=2026-03-31')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_developer_with_costs_view_can_access_route_profitability_report(): void
    {
        $developer = User::factory()->create(['role' => UserRole::Developer]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $developer->id)
            ->getJson('/api/admin/reports/route-profitability')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_route_profitability_rollsup_order_revenue_and_fuel_allocation(): void
    {
        $this->travelTo(Carbon::parse('2026-03-15 12:00:00', 'UTC'));

        $this->seed(CostCatalogSeeder::class);
        $routeManager = User::factory()->create(['role' => UserRole::RouteManager]);
        $driver = User::factory()->create(['role' => UserRole::Driver]);

        $route = OperationalRoute::factory()->create([
            'scheduled_date' => '2026-03-12',
            'coverage_city' => 'London',
            'driver_user_id' => $driver->id,
            'route_status' => OperationalRouteStatus::Completed,
            'notes' => 'Morning industrial loop.',
        ]);

        RouteStop::factory()->create([
            'route_id' => $route->id,
            'sequence' => 1,
            'route_stop_status' => RouteStopStatus::Completed,
            'arrived_at' => Carbon::parse('2026-03-12 09:00:00', 'UTC'),
            'departed_at' => Carbon::parse('2026-03-12 09:22:00', 'UTC'),
        ]);

        /** @var Booking $booking */
        $booking = Booking::factory()->create();

        Order::factory()->create([
            'company_id' => $booking->company_id,
            'booking_id' => $booking->id,
            'route_id' => $route->id,
            'order_status' => OrderStatus::Completed,
            'total_pence' => 12_500,
            'knife_count' => 10,
        ]);

        $petrol = CostItem::query()->where('seed_key', 'cost_plan.petrol')->firstOrFail();

        CostAllocation::query()->create([
            'cost_item_id' => $petrol->id,
            'consumable_usage_id' => null,
            'target_type' => CostAllocationTargetType::Route,
            'target_id' => (string) $route->id,
            'amount_pence' => 3_200,
            'currency' => 'GBP',
            'allocation_method' => CostAllocationMethod::PerRoute,
            'notes' => 'QA fuel slice',
            'created_by_user_id' => null,
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $routeManager->id)
            ->getJson('/api/admin/reports/route-profitability?date_from=2026-03-01&date_to=2026-03-31');

        $res->assertOk();
        self::assertSame(12_500, (int) $res->json('data.kpis.total_route_revenue_pence'));
        self::assertSame(3_200, (int) $res->json('data.kpis.total_allocated_cost_pence'));
        self::assertSame(9_300, (int) $res->json('data.kpis.total_route_margin_pence'));

        $rows = $res->json('data.routes.rows');
        self::assertIsArray($rows);
        self::assertCount(1, $rows);
        self::assertSame(22.0, (float) ($rows[0]['average_stop_minutes'] ?? 0.0));
        self::assertSame('£32.00', $rows[0]['formatted_allocated_fuel'] ?? '');
    }
}
