<?php

namespace Tests\Feature;

use App\Enums\OperationalRouteStatus;
use App\Models\AuditLog;
use App\Models\OperationalRoute;
use App\Models\ServiceArea;
use App\Models\ServiceAreaWaitlistSignup;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ServiceAreaPublicApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_check_returns_covered_when_prefix_matches(): void
    {
        ServiceArea::factory()->create([
            'postcode_prefix' => 'M',
            'active' => true,
            'name' => 'Manchester',
            'city' => 'Manchester',
            'region' => 'Greater Manchester',
        ]);

        $response = $this->postJson('/api/public/service-area/check', [
            'postcode' => 'm1 1aa',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.covered', true)
            ->assertJsonPath('data.area.city', 'Manchester')
            ->assertJsonPath('data.area.label', 'Greater Manchester');
    }

    public function test_check_prefers_longest_prefix(): void
    {
        ServiceArea::query()->create([
            'name' => 'Broad',
            'city' => 'Broad',
            'region' => 'Broad region',
            'country' => 'GB',
            'postcode_prefix' => 'M',
            'active' => true,
        ]);
        $narrow = ServiceArea::query()->create([
            'name' => 'Narrow',
            'city' => 'Narrow city',
            'region' => 'Narrow region',
            'country' => 'GB',
            'postcode_prefix' => 'M1',
            'active' => true,
        ]);

        $response = $this->postJson('/api/public/service-area/check', [
            'postcode' => 'M1 2AB',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.covered', true)
            ->assertJsonPath('data.area.id', (string) $narrow->id)
            ->assertJsonPath('data.area.label', 'Narrow region');
    }

    public function test_check_returns_next_collection_date_when_route_scheduled(): void
    {
        ServiceArea::factory()->create([
            'postcode_prefix' => 'M',
            'active' => true,
            'name' => 'Manchester',
            'city' => 'Manchester',
            'region' => 'Greater Manchester',
        ]);

        OperationalRoute::factory()->create([
            'scheduled_date' => '2026-06-10',
            'route_status' => OperationalRouteStatus::Scheduled,
        ]);

        $response = $this->postJson('/api/public/service-area/check', [
            'postcode' => 'M1 1AA',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.next_collection_date', '2026-06-10');
    }

    public function test_waitlist_creates_signup_and_audit_when_not_covered(): void
    {
        ServiceArea::factory()->create([
            'postcode_prefix' => 'M',
            'active' => true,
        ]);

        $response = $this->postJson('/api/public/service-area/waitlist', [
            'name' => 'Sam Sharp',
            'email' => 'sam@example.com',
            'postcode' => 'B1 1AA',
            'customer_type' => 'business',
            'estimated_knife_count' => 24,
            'notes' => 'New restaurant opening soon.',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.accepted', true)
            ->assertJsonMissingPath('data.id');

        $row = ServiceAreaWaitlistSignup::query()->firstOrFail();
        self::assertSame('sam@example.com', $row->email);
        self::assertSame('B11AA', $row->postcode_normalized);
        self::assertSame(24, $row->estimated_knife_count);

        self::assertTrue(
            AuditLog::query()
                ->where('action', 'public.service_area_waitlist_signup')
                ->where('auditable_type', ServiceAreaWaitlistSignup::class)
                ->exists()
        );
    }

    public function test_waitlist_rejects_in_area_postcode(): void
    {
        ServiceArea::factory()->create([
            'postcode_prefix' => 'M',
            'active' => true,
        ]);

        $response = $this->postJson('/api/public/service-area/waitlist', [
            'name' => 'Sam Sharp',
            'email' => 'sam@example.com',
            'postcode' => 'M1 1AA',
            'customer_type' => 'home',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'in_service_area');

        self::assertSame(0, ServiceAreaWaitlistSignup::query()->count());
    }

    public function test_admin_index_requires_staff_and_lists_rows(): void
    {
        $user = User::factory()->create([
            'role' => \App\Enums\UserRole::SuperAdmin,
        ]);

        ServiceAreaWaitlistSignup::factory()->create([
            'email' => 'waiter@example.com',
            'postcode' => 'EH1 1AA',
        ]);

        $response = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/service-area-waitlist');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.items.0.email', 'waiter@example.com');
    }

    public function test_service_area_public_throttle_returns_429(): void
    {
        ServiceArea::factory()->create([
            'postcode_prefix' => 'M',
            'active' => true,
        ]);

        for ($i = 0; $i < 20; $i++) {
            $this->postJson('/api/public/service-area/check', ['postcode' => 'M1 1AA'])->assertOk();
        }

        $this->postJson('/api/public/service-area/check', ['postcode' => 'M1 1AA'])->assertStatus(429);
    }
}
