<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\ServiceType;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\OperationalRoute;
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
