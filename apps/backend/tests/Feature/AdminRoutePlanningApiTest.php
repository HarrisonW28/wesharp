<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\RouteStopStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\OperationalRoute;
use App\Models\RouteStop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminRoutePlanningApiTest extends TestCase
{
    use RefreshDatabase;

    private function adminHeaders(User $admin): array
    {
        return ['X-WeSharp-Test-User-Id' => (string) $admin->id];
    }

    public function test_route_index_includes_completed_and_incomplete_stop_counts(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $day = '2026-06-10';

        $route = OperationalRoute::factory()->create([
            'scheduled_date' => $day,
            'name' => 'Count probe run',
            'driver_user_id' => null,
        ]);

        RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => null,
            'route_stop_status' => RouteStopStatus::Completed,
            'sequence' => 1,
        ]);
        RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => null,
            'route_stop_status' => RouteStopStatus::NotStarted,
            'sequence' => 2,
        ]);

        $response = $this->withHeaders($this->adminHeaders($admin))
            ->getJson('/api/admin/routes?paginate=1&per_page=20&date='.$day);

        $response->assertOk();
        $row = collect($response->json('data.items'))->firstWhere('id', (string) $route->id);
        self::assertNotNull($row);
        self::assertSame(2, $row['stops_count']);
        self::assertSame(1, $row['completed_stops']);
        self::assertSame(1, $row['incomplete_stops']);
    }

    public function test_destroy_stop_clears_booking_route_assignment(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $day = '2026-06-11';

        $route = OperationalRoute::factory()->create([
            'scheduled_date' => $day,
            'coverage_city' => 'Leeds',
            'driver_user_id' => null,
        ]);

        $company = Company::factory()->create(['city' => 'Leeds']);
        $location = CompanyLocation::factory()->create(['company_id' => $company->id]);

        $booking = Booking::factory()->create([
            'company_id' => $company->id,
            'company_location_id' => $location->id,
            'booking_status' => BookingStatus::Confirmed,
            'scheduled_date' => $day,
        ]);

        $this->withHeaders($this->adminHeaders($admin))
            ->postJson('/api/admin/routes/'.$route->id.'/stops', [
                'booking_id' => $booking->id,
            ])
            ->assertCreated();

        $booking->refresh();
        self::assertSame(BookingStatus::AssignedToRoute, $booking->booking_status);

        $stop = RouteStop::query()->where('booking_id', $booking->id)->firstOrFail();

        $this->withHeaders($this->adminHeaders($admin))
            ->deleteJson('/api/admin/routes/'.$route->id.'/stops/'.$stop->id)
            ->assertOk();

        $booking->refresh();
        self::assertNull($booking->assigned_route_id);
        self::assertSame(BookingStatus::Confirmed, $booking->booking_status);
        self::assertNull(RouteStop::query()->find($stop->id));
    }

    public function test_mark_skipped_transitions_stop_for_assigned_driver(): void
    {
        $day = '2026-06-20';

        $driver = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'scheduled_date' => $day,
            'driver_user_id' => $driver->id,
        ]);

        $stop = RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => null,
            'route_stop_status' => RouteStopStatus::NotStarted,
            'sequence' => 1,
        ]);

        $this->withHeaders(['X-WeSharp-Test-User-Id' => (string) $driver->id])
            ->postJson('/api/admin/route-stops/'.$stop->id.'/mark-skipped', [
                'failure_reason' => 'PHPUnit — site closed',
                'failure_notes' => 'No answer at door.',
                'evidence_placeholder_acknowledged' => true,
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        self::assertSame(
            RouteStopStatus::Skipped,
            $stop->fresh()?->route_stop_status
        );
    }

    public function test_route_drivers_lookup_requires_routes_manage(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $this->withHeaders($this->adminHeaders($admin))
            ->getJson('/api/admin/lookups/route-drivers?q=')
            ->assertOk()
            ->assertJsonPath('success', true);
    }
}
