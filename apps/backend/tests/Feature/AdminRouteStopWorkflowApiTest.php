<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\OrderStatus;
use App\Enums\RouteStopStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\RouteStop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminRouteStopWorkflowApiTest extends TestCase
{
    use RefreshDatabase;

    private function driverHeaders(User $user): array
    {
        return ['X-WeSharp-Test-User-Id' => (string) $user->id];
    }

    public function test_mark_skipped_requires_failure_reason(): void
    {
        $driver = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'driver_user_id' => $driver->id,
        ]);

        $stop = RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => null,
            'route_stop_status' => RouteStopStatus::Arrived,
            'sequence' => 1,
        ]);

        $this->withHeaders($this->driverHeaders($driver))
            ->postJson('/api/admin/route-stops/'.$stop->id.'/mark-skipped', [])
            ->assertStatus(422);

        $this->withHeaders($this->driverHeaders($driver))
            ->postJson('/api/admin/route-stops/'.$stop->id.'/mark-skipped', [
                'failure_reason' => 'ab',
            ])
            ->assertStatus(422);
    }

    public function test_mark_skipped_syncs_booking_to_no_show_and_writes_audits(): void
    {
        $driver = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'driver_user_id' => $driver->id,
        ]);

        $booking = Booking::factory()->create([
            'booking_status' => BookingStatus::AssignedToRoute,
            'assigned_route_id' => $route->id,
        ]);

        $stop = RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => $booking->id,
            'route_stop_status' => RouteStopStatus::Arrived,
            'sequence' => 1,
        ]);

        $this->withHeaders($this->driverHeaders($driver))
            ->postJson('/api/admin/route-stops/'.$stop->id.'/mark-skipped', [
                'failure_reason' => 'Premises closed for holiday',
                'failure_notes' => 'Tried calling contact.',
            ])
            ->assertOk()
            ->assertJsonPath('data.route_stop_status', RouteStopStatus::Skipped->value)
            ->assertJsonPath('data.failure_reason', 'Premises closed for holiday');

        $booking->refresh();
        self::assertSame(BookingStatus::NoShow, $booking->booking_status);
        self::assertStringContainsString('Premises closed for holiday', (string) $booking->internal_notes);

        self::assertTrue(
            AuditLog::query()->where('action', 'route_stop.failed_collection')->exists()
        );
        self::assertTrue(
            AuditLog::query()->where('action', 'booking.synced_from_route_stop')->exists()
        );
    }

    public function test_mark_collected_syncs_booking_when_assigned_to_route(): void
    {
        $driver = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'driver_user_id' => $driver->id,
        ]);

        $booking = Booking::factory()->create([
            'booking_status' => BookingStatus::AssignedToRoute,
            'assigned_route_id' => $route->id,
        ]);

        $stop = RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => $booking->id,
            'route_stop_status' => RouteStopStatus::Arrived,
            'sequence' => 1,
        ]);

        $this->withHeaders($this->driverHeaders($driver))
            ->postJson('/api/admin/route-stops/'.$stop->id.'/mark-collected', [])
            ->assertOk();

        $booking->refresh();
        self::assertSame(BookingStatus::Collected, $booking->booking_status);
        self::assertTrue(
            AuditLog::query()->where('action', 'booking.synced_from_route_stop')->exists()
        );
    }

    public function test_invalid_transition_returns_422(): void
    {
        $driver = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'driver_user_id' => $driver->id,
        ]);

        $stop = RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => null,
            'route_stop_status' => RouteStopStatus::Travelling,
            'sequence' => 1,
        ]);

        $this->withHeaders($this->driverHeaders($driver))
            ->postJson('/api/admin/route-stops/'.$stop->id.'/mark-collected', [])
            ->assertStatus(422);
    }

    public function test_mark_returned_syncs_booking_to_returned(): void
    {
        config()->set('wesharp_evidence.require_return_photo', false);

        $driver = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'driver_user_id' => $driver->id,
        ]);

        $booking = Booking::factory()->create([
            'booking_status' => BookingStatus::QualityChecked,
            'assigned_route_id' => $route->id,
        ]);

        $stop = RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => $booking->id,
            'route_stop_status' => RouteStopStatus::Collected,
            'sequence' => 1,
        ]);

        $this->withHeaders($this->driverHeaders($driver))
            ->postJson('/api/admin/route-stops/'.$stop->id.'/mark-returned', [])
            ->assertOk()
            ->assertJsonPath('data.route_stop_status', RouteStopStatus::Returned->value);

        $booking->refresh();
        self::assertSame(BookingStatus::Returned, $booking->booking_status);
    }

    public function test_updating_stop_actual_knife_count_syncs_booking_and_order(): void
    {
        $driver = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $route = OperationalRoute::factory()->create([
            'driver_user_id' => $driver->id,
        ]);

        $booking = Booking::factory()->create([
            'booking_status' => BookingStatus::Collected,
            'assigned_route_id' => $route->id,
        ]);

        $order = Order::factory()->create([
            'company_id' => $booking->company_id,
            'booking_id' => $booking->id,
            'order_status' => OrderStatus::Draft,
            'price_per_knife_pence' => 1000,
            'subtotal_pence' => 0,
            'tax_pence' => 0,
            'total_pence' => 0,
            'knife_count' => 0,
        ]);

        $stop = RouteStop::factory()->create([
            'route_id' => $route->id,
            'booking_id' => $booking->id,
            'route_stop_status' => RouteStopStatus::Collected,
            'sequence' => 1,
        ]);

        $this->withHeaders($this->driverHeaders($driver))
            ->putJson('/api/admin/route-stops/'.$stop->id, [
                'actual_knife_count' => 5,
            ])
            ->assertOk()
            ->assertJsonPath('data.actual_knife_count', 5);

        self::assertSame(5, $booking->fresh()->actual_knife_count);
        self::assertSame(5, $order->fresh()->knife_count);
    }
}
