<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\OrderStatus;
use App\Enums\ServiceType;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\Knife;
use App\Models\OrderItem;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminBulkOrderItemsApiTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{ops: User, orderId: string, company: Company} */
    private function seedOrder(): array
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

        return ['ops' => $ops, 'orderId' => $orderId, 'company' => $company];
    }

    public function test_bulk_order_items_registers_blades_and_recomputes_totals_from_lines(): void
    {
        ['ops' => $ops, 'orderId' => $orderId] = $this->seedOrder();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/bulk-order-items', [
                'items' => [
                    [
                        'knife_type' => 'chefs',
                        'label' => 'Chef primary',
                        'quantity' => 2,
                        'unit_amount_pence' => 500,
                        'notes' => 'Batch A',
                    ],
                    [
                        'knife_type' => 'paring',
                        'quantity' => 1,
                        'unit_amount_pence' => 300,
                    ],
                ],
            ]);

        $res->assertOk()->assertJsonPath('success', true);
        self::assertSame(1300, (int) $res->json('data.subtotal_pence'));
        self::assertSame(260, (int) $res->json('data.tax_pence'));
        self::assertSame(1560, (int) $res->json('data.total_pence'));
        self::assertSame(3, (int) $res->json('data.knife_count'));

        self::assertSame(3, OrderItem::query()->where('order_id', $orderId)->count());
    }

    public function test_bulk_order_items_rejects_quantity_gt_one_for_existing_knife(): void
    {
        ['ops' => $ops, 'orderId' => $orderId, 'company' => $company] = $this->seedOrder();

        $knifeRes = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/knives', [
                'company_id' => $company->id,
                'knife_type' => 'inventory',
                'label' => 'Loaner',
            ]);
        $knifeRes->assertCreated();
        /** @phpstan-ignore-next-line */
        $knifeId = (string) $knifeRes->json('data.id');

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/bulk-order-items', [
                'items' => [
                    [
                        'knife_id' => $knifeId,
                        'quantity' => 3,
                        'unit_amount_pence' => 100,
                    ],
                ],
            ])
            ->assertStatus(422);
    }

    public function test_bulk_order_items_links_inventory_knife_and_creates_line(): void
    {
        ['ops' => $ops, 'orderId' => $orderId, 'company' => $company] = $this->seedOrder();

        $knifeRes = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/knives', [
                'company_id' => $company->id,
                'knife_type' => 'slicer',
                'label' => 'Cold slicer',
            ]);
        $knifeRes->assertCreated();
        /** @phpstan-ignore-next-line */
        $knifeId = (string) $knifeRes->json('data.id');

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/bulk-order-items', [
                'items' => [
                    [
                        'knife_id' => $knifeId,
                        'quantity' => 1,
                        'unit_amount_pence' => 800,
                        'notes' => 'Line note',
                    ],
                ],
            ]);

        $res->assertOk();
        /** @phpstan-ignore-next-line */
        $k = Knife::query()->find($knifeId);
        self::assertNotNull($k);
        self::assertSame($orderId, (string) $k->order_id);

        self::assertSame(1, OrderItem::query()->where('order_id', $orderId)->where('knife_id', $knifeId)->count());
    }
}
