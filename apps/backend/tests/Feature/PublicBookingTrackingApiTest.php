<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Company;
use App\Models\User;
use App\Enums\UserRole;
use App\Support\Portal\BookingTrackingToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class PublicBookingTrackingApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_tracking_returns_payload_without_booking_uuid(): void
    {
        $company = Company::factory()->create();
        $booking = Booking::factory()->create(['company_id' => $company->id]);
        $token = BookingTrackingToken::mint($booking);

        $json = $this->getJson('/api/public/track/'.$token)
            ->assertOk()
            ->json('data');

        self::assertArrayNotHasKey('id', $json);
        self::assertArrayHasKey('reference', $json);
        self::assertIsString($json['reference']);
        self::assertArrayHasKey('fulfilment', $json);
        self::assertArrayNotHasKey('activity_timeline', $json);
        if (isset($json['company']) && is_array($json['company'])) {
            self::assertArrayNotHasKey('id', $json['company']);
        }
    }

    public function test_invalid_tracking_token_returns_404(): void
    {
        $this->getJson('/api/public/track/not-a-real-token')->assertNotFound();
    }

    public function test_other_tenant_cannot_fetch_tracking_link(): void
    {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();
        $booking = Booking::factory()->create(['company_id' => $companyA->id]);

        $userB = User::factory()->create([
            'company_id' => $companyB->id,
            'role' => UserRole::CustomerOwner,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $userB->id)
            ->getJson('/api/account/bookings/'.$booking->id.'/tracking-link')
            ->assertForbidden();
    }

    public function test_tenant_can_fetch_tracking_link_for_own_booking(): void
    {
        $company = Company::factory()->create();
        $booking = Booking::factory()->create(['company_id' => $company->id]);
        $user = User::factory()->create([
            'company_id' => $company->id,
            'role' => UserRole::CustomerOwner,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/account/bookings/'.$booking->id.'/tracking-link')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['tracking_url']]);
    }
}
