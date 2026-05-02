<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Order;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CustomerPortalActivityTimelineApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_booking_detail_includes_safe_activity_timeline_only(): void
    {
        $tenant = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();
        $booking = Booking::query()->where('company_id', $tenant->company_id)->firstOrFail();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $tenant->id)
            ->getJson('/api/account/bookings/'.$booking->id)
            ->assertOk();

        $items = $res->json('data.activity_timeline');
        $this->assertIsArray($items);
        foreach ($items as $row) {
            $this->assertArrayHasKey('at', $row);
            $this->assertArrayHasKey('label', $row);
            $this->assertCount(2, $row);
        }
    }

    public function test_order_detail_includes_safe_activity_timeline_only(): void
    {
        $tenant = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();
        $order = Order::query()->where('company_id', $tenant->company_id)->firstOrFail();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $tenant->id)
            ->getJson('/api/account/orders/'.$order->id)
            ->assertOk();

        $items = $res->json('data.activity_timeline');
        $this->assertIsArray($items);
        foreach ($items as $row) {
            $this->assertArrayHasKey('at', $row);
            $this->assertArrayHasKey('label', $row);
            $this->assertCount(2, $row);
        }
    }

    public function test_subscription_show_includes_safe_activity_timeline(): void
    {
        $tenant = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();
        $this->assertNotNull($tenant->company_id);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $tenant->id)
            ->getJson('/api/account/subscription')
            ->assertOk();

        $sub = $res->json('data.subscription');
        $this->assertIsArray($sub);
        $items = $sub['activity_timeline'] ?? null;
        $this->assertIsArray($items);
        foreach ($items as $row) {
            $this->assertArrayHasKey('at', $row);
            $this->assertArrayHasKey('label', $row);
            $this->assertCount(2, $row);
        }
    }
}
