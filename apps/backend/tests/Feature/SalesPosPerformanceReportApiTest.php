<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class SalesPosPerformanceReportApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse('2026-03-15 12:00:00', config('app.timezone')));
    }

    public function test_route_manager_cannot_view_sales_pos_performance_report(): void
    {
        $routeManager = User::factory()->create(['role' => UserRole::RouteManager]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $routeManager->id)
            ->getJson('/api/admin/reports/sales-performance')
            ->assertForbidden();
    }

    public function test_route_manager_cannot_list_sales_staff_lookup(): void
    {
        $routeManager = User::factory()->create(['role' => UserRole::RouteManager]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $routeManager->id)
            ->getJson('/api/admin/lookups/sales-staff')
            ->assertForbidden();
    }

    public function test_finance_user_can_view_report_payload_shape(): void
    {
        $finance = User::factory()->create(['role' => UserRole::Finance]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/reports/sales-performance?date_from=2026-03-01&date_to=2026-03-31')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'definitions',
                    'filters_applied',
                    'kpis',
                    'checkout',
                    'pos_payments',
                    'discounts',
                    'quotes_and_estimates',
                    'allocated_costs',
                    'customer_acquisition',
                    'sales_follow_ups',
                    'sales_user_performance',
                    'sales_user_performance_scope_note',
                    'disclaimer',
                ],
            ]);
    }

    public function test_finance_user_can_list_sales_staff_lookup(): void
    {
        $finance = User::factory()->create(['role' => UserRole::Finance]);
        User::factory()->create(['role' => UserRole::Sales, 'name' => 'Lookup Sales']);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/lookups/sales-staff')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['items']]);
    }

    public function test_sales_user_sees_only_own_sales_created_bookings(): void
    {
        $alice = User::factory()->create(['role' => UserRole::Sales]);
        $bob = User::factory()->create(['role' => UserRole::Sales]);

        $bookingAlice = Booking::factory()->create();
        AuditLog::factory()->create([
            'actor_id' => $alice->id,
            'action' => 'booking.created',
            'auditable_type' => Booking::class,
            'auditable_id' => $bookingAlice->id,
            'created_at' => now(),
        ]);

        $bookingBob = Booking::factory()->create();
        AuditLog::factory()->create([
            'actor_id' => $bob->id,
            'action' => 'booking.created',
            'auditable_type' => Booking::class,
            'auditable_id' => $bookingBob->id,
            'created_at' => now(),
        ]);

        $qs = '?date_from=2026-03-01&date_to=2026-03-31';

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $alice->id)
            ->getJson('/api/admin/reports/sales-performance'.$qs)
            ->assertOk()
            ->assertJsonPath('data.kpis.sales_created_bookings_distinct_count', 1);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $bob->id)
            ->getJson('/api/admin/reports/sales-performance'.$qs)
            ->assertOk()
            ->assertJsonPath('data.kpis.sales_created_bookings_distinct_count', 1);
    }

    public function test_sales_user_cannot_scope_to_peer_via_sales_user_id_query(): void
    {
        $alice = User::factory()->create(['role' => UserRole::Sales]);
        $bob = User::factory()->create(['role' => UserRole::Sales]);

        $bookingAlice = Booking::factory()->create();
        AuditLog::factory()->create([
            'actor_id' => $alice->id,
            'action' => 'booking.created',
            'auditable_type' => Booking::class,
            'auditable_id' => $bookingAlice->id,
            'created_at' => now(),
        ]);

        $qs = '?date_from=2026-03-01&date_to=2026-03-31&sales_user_id='.$alice->id;

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $bob->id)
            ->getJson('/api/admin/reports/sales-performance'.$qs)
            ->assertOk()
            ->assertJsonPath('data.filters_applied.sales_user_id', (string) $bob->id)
            ->assertJsonPath('data.kpis.sales_created_bookings_distinct_count', 0);
    }

    public function test_finance_can_filter_by_sales_user_id(): void
    {
        $finance = User::factory()->create(['role' => UserRole::Finance]);
        $alice = User::factory()->create(['role' => UserRole::Sales]);
        $bob = User::factory()->create(['role' => UserRole::Sales]);

        foreach ([$alice, $bob] as $sales) {
            $b = Booking::factory()->create();
            AuditLog::factory()->create([
                'actor_id' => $sales->id,
                'action' => 'booking.created',
                'auditable_type' => Booking::class,
                'auditable_id' => $b->id,
                'created_at' => now(),
            ]);
        }

        $qs = '?date_from=2026-03-01&date_to=2026-03-31';

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/reports/sales-performance'.$qs)
            ->assertOk()
            ->assertJsonPath('data.kpis.sales_created_bookings_distinct_count', 2);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/reports/sales-performance'.$qs.'&sales_user_id='.$alice->id)
            ->assertOk()
            ->assertJsonPath('data.filters_applied.sales_user_id', (string) $alice->id)
            ->assertJsonPath('data.kpis.sales_created_bookings_distinct_count', 1);
    }

    public function test_finance_sees_sales_user_leaderboard_when_unscoped(): void
    {
        $finance = User::factory()->create(['role' => UserRole::Finance]);
        $alice = User::factory()->create(['role' => UserRole::Sales]);

        $bookingAlice = Booking::factory()->create();
        AuditLog::factory()->create([
            'actor_id' => $alice->id,
            'action' => 'booking.created',
            'auditable_type' => Booking::class,
            'auditable_id' => $bookingAlice->id,
            'created_at' => now(),
        ]);

        $qs = '?date_from=2026-03-01&date_to=2026-03-31';

        $unscoped = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/reports/sales-performance'.$qs)
            ->assertOk();

        $unscoped->assertJsonPath('data.sales_user_performance_scope_note', null);

        $rows = $unscoped->json('data.sales_user_performance');
        self::assertIsArray($rows);

        $hit = null;
        foreach ($rows as $row) {
            if ((int) ($row['sales_user_id'] ?? 0) === (int) $alice->id) {
                $hit = $row;
                break;
            }
        }

        self::assertNotNull($hit);
        self::assertGreaterThanOrEqual(1, (int) ($hit['bookings_created_count'] ?? 0));

        $scoped = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/reports/sales-performance'.$qs.'&sales_user_id='.$alice->id)
            ->assertOk();

        self::assertSame([], $scoped->json('data.sales_user_performance'));
        self::assertNotNull($scoped->json('data.sales_user_performance_scope_note'));
    }
}
