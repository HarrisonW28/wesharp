<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\OrderStatus;
use App\Enums\ServiceType;
use App\Mail\GenericNotificationMailable;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\NotificationDelivery;
use App\Models\Order;
use App\Models\User;
use App\Services\Notifications\OrderEmailService;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

final class OrderEmailNotificationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);

        Config::set('notifications.enabled', true);
        Config::set('notifications.email.queue', false);
    }

    public function test_order_created_sends_email_and_logs_delivery(): void
    {
        Mail::fake();

        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->where('city', 'Manchester')->firstOrFail();
        $company->forceFill(['billing_email' => 'billing@example.test'])->save();
        $location = CompanyLocation::query()->where('company_id', $company->id)->firstOrFail();

        $booking = Booking::query()->create([
            'company_id' => $company->id,
            'company_location_id' => $location->id,
            'booking_status' => BookingStatus::Confirmed,
            'service_type' => ServiceType::Collection,
            'scheduled_date' => now()->addDay()->toDateString(),
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders', [
                'company_id' => $company->id,
                'booking_id' => $booking->id,
                'order_status' => OrderStatus::Draft->value,
                'knife_count' => 0,
                'discount_pence' => 0,
                'subtotal_pence' => 0,
                'tax_pence' => 0,
                'total_pence' => 0,
            ]);

        $res->assertCreated();
        $orderId = (string) $res->json('data.id');

        Mail::assertSent(GenericNotificationMailable::class, 1);

        $row = NotificationDelivery::query()
            ->where('source_type', Order::class)
            ->where('source_id', $orderId)
            ->where('type', 'order.created')
            ->firstOrFail();

        self::assertSame('sent', $row->status);
    }

    public function test_status_transition_sends_lifecycle_email_with_idempotency_per_status(): void
    {
        Mail::fake();

        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->where('city', 'Manchester')->firstOrFail();
        $company->forceFill(['billing_email' => 'billing@example.test'])->save();
        $location = CompanyLocation::query()->where('company_id', $company->id)->firstOrFail();

        $booking = Booking::query()->create([
            'company_id' => $company->id,
            'company_location_id' => $location->id,
            'booking_status' => BookingStatus::Confirmed,
            'service_type' => ServiceType::Collection,
            'scheduled_date' => now()->addDay()->toDateString(),
        ]);

        $orderRes = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders', [
                'company_id' => $company->id,
                'booking_id' => $booking->id,
                'order_status' => OrderStatus::Draft->value,
                'knife_count' => 0,
                'discount_pence' => 0,
                'subtotal_pence' => 0,
                'tax_pence' => 0,
                'total_pence' => 0,
            ]);
        $orderRes->assertCreated();
        $orderId = (string) $orderRes->json('data.id');

        Mail::fake();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/transition', [
                'target_status' => OrderStatus::Received->value,
            ])->assertOk();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/transition', [
                'target_status' => OrderStatus::Received->value,
            ])->assertOk();

        Mail::assertSent(GenericNotificationMailable::class, 1);

        NotificationDelivery::query()
            ->where('source_type', Order::class)
            ->where('source_id', $orderId)
            ->where('type', 'order.status.received')
            ->firstOrFail();
    }

    public function test_order_created_notification_is_idempotent_when_retried(): void
    {
        Mail::fake();

        $order = Order::factory()->create();
        $order->company()->update(['billing_email' => 'billing@example.test']);

        $svc = app(OrderEmailService::class);
        $svc->sendOrderCreated($order);
        $svc->sendOrderCreated($order);

        Mail::assertSent(GenericNotificationMailable::class, 1);
    }
}
