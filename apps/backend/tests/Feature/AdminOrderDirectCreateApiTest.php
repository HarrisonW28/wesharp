<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\OrderStatus;
use App\Enums\ServiceType;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\Order;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminOrderDirectCreateApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_store_creates_order_linked_to_booking(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        /** @phpstan-ignore-next-line */
        $company = Company::query()->where('city', 'Manchester')->firstOrFail();

        $location = CompanyLocation::query()->where('company_id', $company->id)->firstOrFail();

        /** @phpstan-ignore-next-line */
        $booking = Booking::query()->create([
            'company_id' => $company->id,
            'company_location_id' => $location->id,
            'booking_status' => BookingStatus::Confirmed,
            'service_type' => ServiceType::Collection,
            /** @phpstan-ignore-next-line */
            'scheduled_date' => now()->addDay()->toDateString(),
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/orders', [
                'company_id' => $company->id,
                'booking_id' => $booking->id,
                'order_status' => OrderStatus::Draft->value,
                'knife_count' => 0,
                'subtotal_pence' => 0,
                'tax_pence' => 0,
                'total_pence' => 0,
            ]);

        $res->assertCreated()
            ->assertJsonPath('success', true);

        /** @phpstan-ignore-next-line */
        $orderId = (string) $res->json('data.id');
        self::assertNotEmpty($orderId);

        /** @phpstan-ignore-next-line */
        self::assertSame($booking->id, Order::query()->find($orderId)?->booking_id);
    }
}
