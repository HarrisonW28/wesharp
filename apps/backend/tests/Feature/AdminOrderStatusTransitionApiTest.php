<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\OrderStatus;
use App\Enums\ServiceType;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\Order;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminOrderStatusTransitionApiTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{ops: User, orderId: string} */
    private function seedDraftOrderWithLine(): array
    {
        $this->seed(WeSharpDemoSeeder::class);
        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
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
        /** @phpstan-ignore-next-line */
        $orderId = (string) $orderRes->json('data.id');

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/bulk-order-items', [
                'items' => [
                    [
                        'knife_type' => 'chefs',
                        'label' => 'Line A',
                        'quantity' => 1,
                        'unit_amount_pence' => 500,
                    ],
                ],
            ])->assertOk();

        return ['ops' => $ops, 'orderId' => $orderId];
    }

    public function test_draft_to_received_records_status_audit(): void
    {
        ['ops' => $ops, 'orderId' => $orderId] = $this->seedDraftOrderWithLine();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/transition', [
                'target_status' => OrderStatus::Received->value,
            ]);

        $res->assertOk()->assertJsonPath('data.status', OrderStatus::Received->value);

        self::assertTrue(
            AuditLog::query()
                ->where('action', 'order.status_changed')
                /** @phpstan-ignore-next-line */
                ->where('auditable_id', $orderId)
                ->whereJsonContains('payload->from', OrderStatus::Draft->value)
                ->whereJsonContains('payload->to', OrderStatus::Received->value)
                ->exists()
        );
    }

    public function test_invalid_transition_is_blocked(): void
    {
        ['ops' => $ops, 'orderId' => $orderId] = $this->seedDraftOrderWithLine();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/transition', [
                'target_status' => OrderStatus::InProgress->value,
            ]);

        $res->assertStatus(422);
    }

    public function test_received_to_inspection_to_in_progress(): void
    {
        ['ops' => $ops, 'orderId' => $orderId] = $this->seedDraftOrderWithLine();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/transition', [
                'target_status' => OrderStatus::Received->value,
            ])->assertOk();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/transition', [
                'target_status' => OrderStatus::Inspection->value,
            ])->assertOk();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/transition', [
                'target_status' => OrderStatus::InProgress->value,
            ])->assertOk();

        /** @phpstan-ignore-next-line */
        $order = Order::query()->findOrFail($orderId);
        self::assertSame(OrderStatus::InProgress, $order->order_status);
    }
}
