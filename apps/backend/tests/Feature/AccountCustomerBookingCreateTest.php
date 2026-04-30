<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\CompanyLocation;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AccountCustomerBookingCreateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_portal_user_can_create_booking_with_required_window(): void
    {
        $tenant = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();
        $loc = CompanyLocation::query()->where('company_id', $tenant->company_id)->orderBy('label')->firstOrFail();

        $day = now()->addDays(3)->toDateString();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $tenant->id)->postJson('/api/account/bookings', [
            'company_location_id' => (string) $loc->id,
            'requested_collection_date' => $day,
            'time_window_start' => '09:00',
            'time_window_end' => '12:00',
            'service_type' => 'collection',
            'estimated_knife_count' => 12,
            'customer_notes' => 'Ring the service bell.',
            'damage_acknowledged' => true,
            'terms_accepted' => true,
        ]);

        $res->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'requested')
            ->assertJsonPath('data.requested_collection_date', $day);
    }

    public function test_peer_location_id_is_rejected(): void
    {
        $tenant = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();
        $otherLoc = CompanyLocation::query()->where('company_id', '!=', $tenant->company_id)->firstOrFail();

        $day = now()->addDays(3)->toDateString();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $tenant->id)->postJson('/api/account/bookings', [
            'location_id' => (string) $otherLoc->id,
            'requested_date' => $day,
            'time_window_start' => '09:00',
            'time_window_end' => '12:00',
            'service_type' => 'collection',
            'damage_acknowledged' => true,
            'terms_accepted' => true,
        ])->assertUnprocessable();
    }

    public function test_end_before_start_fails_validation(): void
    {
        $tenant = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();
        $loc = CompanyLocation::query()->where('company_id', $tenant->company_id)->orderBy('label')->firstOrFail();
        $day = now()->addDays(3)->toDateString();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $tenant->id)->postJson('/api/account/bookings', [
            'location_id' => (string) $loc->id,
            'requested_date' => $day,
            'time_window_start' => '14:00',
            'time_window_end' => '09:00',
            'service_type' => 'collection',
            'damage_acknowledged' => true,
            'terms_accepted' => true,
        ])->assertUnprocessable();
    }
}
