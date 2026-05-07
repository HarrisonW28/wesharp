<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\RouteStopStatus;
use App\Enums\ServiceType;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\OperationalRoute;
use App\Models\Order;
use App\Models\RouteStop;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminBookingsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_index_returns_bookings_for_internal_user(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $response = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->getJson('/api/admin/bookings?per_page=5');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'items' => [],
                ],
                'meta' => ['pagination'],
            ]);
    }

    public function test_create_confirm_and_cancel_flow(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $company = Company::query()->firstOrFail();
        $location = CompanyLocation::query()->where('company_id', $company->id)->firstOrFail();

        $create = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings', [
                'company_id' => $company->id,
                'location_id' => $location->id,
                'requested_date' => now()->addWeek()->toDateString(),
                'service_type' => ServiceType::Collection->value,
                'internal_notes' => 'API test',
                'price_estimate' => 12_000,
            ]);

        $create->assertCreated();
        $bookingId = $create->json('data.id');
        self::assertNotEmpty($bookingId);

        $confirm = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings/'.$bookingId.'/confirm');

        $confirm->assertOk()
            ->assertJsonPath('data.status', BookingStatus::Confirmed->value);

        $cancel = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings/'.$bookingId.'/cancel');

        $cancel->assertOk()
            ->assertJsonPath('data.status', BookingStatus::Cancelled->value);
    }

    public function test_assign_route_requires_matching_route_date(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $route = OperationalRoute::query()->firstOrFail();
        $booking = Booking::factory()->create([
            'company_id' => Company::query()->first()->id,
            'company_location_id' => CompanyLocation::query()->first()->id,
            'booking_status' => BookingStatus::Confirmed,
            'scheduled_date' => $route->scheduled_date->format('Y-m-d'),
            'service_type' => ServiceType::Collection,
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings/'.$booking->id.'/assign-route', [
                'route_id' => $route->id,
            ]);

        $res->assertOk()
            ->assertJsonPath('data.status', BookingStatus::AssignedToRoute->value);

        self::assertSame((string) $route->id, Booking::query()->find($booking->id)?->assigned_route_id);
    }

    public function test_assign_route_rejects_cancelled_booking(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $route = OperationalRoute::query()->firstOrFail();
        $booking = Booking::factory()->create([
            'company_id' => Company::query()->first()->id,
            'company_location_id' => CompanyLocation::query()->first()->id,
            'booking_status' => BookingStatus::Cancelled,
            'scheduled_date' => $route->scheduled_date->format('Y-m-d'),
            'service_type' => ServiceType::Collection,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings/'.$booking->id.'/assign-route', [
                'route_id' => $route->id,
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Cancelled or no-show bookings cannot be assigned to a route.');
    }

    public function test_convert_to_order_rejects_cancelled_booking(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $booking = Booking::factory()->create([
            'company_id' => Company::query()->first()->id,
            'company_location_id' => CompanyLocation::query()->first()->id,
            'booking_status' => BookingStatus::Cancelled,
            'scheduled_date' => now()->addWeek()->toDateString(),
            'service_type' => ServiceType::Collection,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings/'.$booking->id.'/convert-to-order', [])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Cancelled or no-show bookings cannot be converted to an order.');
    }

    public function test_assign_route_accepts_sequence_and_optional_confirm_window(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $route = OperationalRoute::query()->firstOrFail();
        $booking = Booking::factory()->create([
            'company_id' => Company::query()->first()->id,
            'company_location_id' => CompanyLocation::query()->first()->id,
            'booking_status' => BookingStatus::Confirmed,
            'scheduled_date' => $route->scheduled_date->format('Y-m-d'),
            'confirmed_collection_date' => $route->scheduled_date->format('Y-m-d'),
            'service_type' => ServiceType::Collection,
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings/'.$booking->id.'/assign-route', [
                'route_id' => $route->id,
                'sequence' => 2,
                'confirmed_time_window_start' => '10:00',
                'confirmed_time_window_end' => '12:00',
            ]);

        $res->assertOk()
            ->assertJsonPath('data.status', BookingStatus::AssignedToRoute->value);

        $stop = RouteStop::query()->where('booking_id', $booking->id)->firstOrFail();
        self::assertSame(2, $stop->sequence);
        $refreshed = Booking::query()->findOrFail($booking->id);
        self::assertNotNull($refreshed->confirmed_time_window_start);
        self::assertNotNull($refreshed->confirmed_time_window_end);
    }

    public function test_index_supports_filters(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->getJson('/api/admin/bookings?company_id='.$company->id.'&route_assigned=unassigned&q=demo')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_confirm_accepts_confirmed_window_payload(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->firstOrFail();
        $location = CompanyLocation::query()->where('company_id', $company->id)->firstOrFail();
        $day = now()->addWeek()->toDateString();

        $create = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings', [
                'company_id' => $company->id,
                'location_id' => $location->id,
                'requested_date' => $day,
                'service_type' => ServiceType::Collection->value,
            ]);
        $create->assertCreated();
        $bookingId = $create->json('data.id');

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings/'.$bookingId.'/confirm', [
                'confirmed_time_window_start' => '09:30',
                'confirmed_time_window_end' => '11:00',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', BookingStatus::Confirmed->value);

        $row = Booking::query()->findOrFail($bookingId);
        self::assertNotNull($row->confirmed_time_window_start);
        self::assertNotNull($row->confirmed_time_window_end);
    }

    public function test_unassign_route_returns_to_confirmed_when_stop_not_started(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $route = OperationalRoute::query()->firstOrFail();
        $booking = Booking::factory()->create([
            'company_id' => Company::query()->first()->id,
            'company_location_id' => CompanyLocation::query()->first()->id,
            'booking_status' => BookingStatus::Confirmed,
            'scheduled_date' => $route->scheduled_date->format('Y-m-d'),
            'service_type' => ServiceType::Collection,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings/'.$booking->id.'/assign-route', [
                'route_id' => $route->id,
            ])
            ->assertOk();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings/'.$booking->id.'/unassign-route')
            ->assertOk()
            ->assertJsonPath('data.status', BookingStatus::Confirmed->value);

        self::assertNull(Booking::query()->find($booking->id)?->assigned_route_id);
    }

    public function test_unassign_route_blocked_when_stop_in_progress(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $route = OperationalRoute::query()->firstOrFail();
        $booking = Booking::factory()->create([
            'company_id' => Company::query()->first()->id,
            'company_location_id' => CompanyLocation::query()->first()->id,
            'booking_status' => BookingStatus::AssignedToRoute,
            'assigned_route_id' => $route->id,
            'scheduled_date' => $route->scheduled_date->format('Y-m-d'),
            'service_type' => ServiceType::Collection,
        ]);

        RouteStop::query()->create([
            'route_id' => $route->id,
            'booking_id' => $booking->id,
            'route_stop_status' => RouteStopStatus::Travelling,
            'sequence' => 9,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings/'.$booking->id.'/unassign-route')
            ->assertStatus(422);
    }

    public function test_hard_delete_returns_blockers_when_orders_exist(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $booking = Booking::factory()->create([
            'company_id' => Company::query()->first()->id,
            'company_location_id' => CompanyLocation::query()->first()->id,
            'booking_status' => BookingStatus::Requested,
            'scheduled_date' => now()->addDay()->toDateString(),
            'service_type' => ServiceType::Collection,
        ]);

        Order::factory()->create([
            'company_id' => $booking->company_id,
            'booking_id' => $booking->id,
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->deleteJson('/api/admin/bookings/'.$booking->id);

        $res->assertStatus(422)
            ->assertJsonPath('error.code', 'booking_delete_blocked');

        /** @phpstan-ignore-next-line */
        self::assertContains('orders', data_get($res->json(), 'error.details.blockers'));
    }

    public function test_confirm_writes_booking_confirmed_audit(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->firstOrFail();
        $location = CompanyLocation::query()->where('company_id', $company->id)->firstOrFail();

        $create = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings', [
                'company_id' => $company->id,
                'location_id' => $location->id,
                'requested_date' => now()->addWeek()->toDateString(),
                'service_type' => ServiceType::Collection->value,
            ]);
        $create->assertCreated();
        $bookingId = $create->json('data.id');

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings/'.$bookingId.'/confirm')
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'auditable_type' => Booking::class,
            'auditable_id' => $bookingId,
            'action' => 'booking.confirmed',
        ]);
    }

    public function test_confirm_creates_draft_order_and_activates_company(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->firstOrFail();
        $company->update(['company_status' => \App\Enums\CompanyStatus::Lead]);
        $location = CompanyLocation::query()->where('company_id', $company->id)->firstOrFail();

        $create = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings', [
                'company_id' => $company->id,
                'location_id' => $location->id,
                'requested_date' => now()->addWeek()->toDateString(),
                'service_type' => ServiceType::Collection->value,
                'estimated_knife_count' => 3,
            ]);
        $create->assertCreated();
        $bookingId = (string) $create->json('data.id');

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings/'.$bookingId.'/confirm')
            ->assertOk();

        $order = Order::query()->where('booking_id', $bookingId)->first();
        self::assertNotNull($order);
        self::assertSame('draft', $order->order_status->value);
        self::assertGreaterThanOrEqual(0, (int) $order->total_pence);
        self::assertSame('active', $company->fresh()->company_status?->value);
    }

    public function test_convert_to_order_marks_booking_converted(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $booking = Booking::factory()->create([
            'company_id' => Company::query()->first()->id,
            'company_location_id' => CompanyLocation::query()->first()->id,
            'booking_status' => BookingStatus::Collected,
            'scheduled_date' => now()->addDay()->toDateString(),
            'service_type' => ServiceType::Collection,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings/'.$booking->id.'/convert-to-order', [])
            ->assertCreated();

        self::assertSame(BookingStatus::ConvertedToOrder, $booking->fresh()->booking_status);
    }
}
