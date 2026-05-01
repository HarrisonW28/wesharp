<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\KnifeStatus;
use App\Enums\OrderStatus;
use App\Enums\ServiceType;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\Knife;
use App\Models\OrderItem;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class BulkOrderWorkshopApiTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{ops: User, orderId: string} */
    private function seedOrderWithKnife(): array
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
                        'label' => 'Bulk blade',
                        'quantity' => 1,
                        'unit_amount_pence' => 500,
                    ],
                ],
            ])->assertOk();

        return ['ops' => $ops, 'orderId' => $orderId];
    }

    public function test_bulk_knife_status_applies_and_skips_invalid(): void
    {
        ['ops' => $ops, 'orderId' => $orderId] = $this->seedOrderWithKnife();
        /** @phpstan-ignore-next-line */
        $knife = Knife::query()->where('order_id', $orderId)->firstOrFail();
        $knife->update(['knife_status' => KnifeStatus::Logged]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/bulk-workshop', [
                'mode' => 'knife_status',
                'knife_ids' => [(string) $knife->id],
                'line_item_ids' => [],
                'target_status' => KnifeStatus::Inspected->value,
            ]);

        $res->assertOk()->assertJsonPath('success', true);
        self::assertTrue((bool) $res->json('data.bulk_workshop_summary.any_applied'));
        $knife->refresh();
        self::assertSame(KnifeStatus::Inspected, $knife->knife_status);

        $knife->update(['knife_status' => KnifeStatus::Returned]);
        $res2 = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/bulk-workshop', [
                'mode' => 'knife_status',
                'knife_ids' => [(string) $knife->id],
                'line_item_ids' => [],
                'target_status' => KnifeStatus::Inspected->value,
            ]);
        $res2->assertOk();
        self::assertFalse((bool) $res2->json('data.bulk_workshop_summary.any_applied'));
        self::assertNotEmpty($res2->json('data.bulk_workshop_summary.skipped_knives'));
    }

    public function test_bulk_workshop_writes_order_audit_when_applied(): void
    {
        ['ops' => $ops, 'orderId' => $orderId] = $this->seedOrderWithKnife();
        /** @phpstan-ignore-next-line */
        $knife = Knife::query()->where('order_id', $orderId)->firstOrFail();
        $knife->update(['knife_status' => KnifeStatus::Logged]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/bulk-workshop', [
                'mode' => 'append_notes',
                'knife_ids' => [(string) $knife->id],
                'append_notes' => 'Batch intake note',
            ])->assertOk();

        self::assertTrue(
            AuditLog::query()
                ->where('action', 'order.bulk_workshop')
                /** @phpstan-ignore-next-line */
                ->where('auditable_id', $orderId)
                ->exists()
        );
    }

    public function test_bulk_line_prices_require_confirmation(): void
    {
        ['ops' => $ops, 'orderId' => $orderId] = $this->seedOrderWithKnife();
        /** @phpstan-ignore-next-line */
        $itemId = (string) OrderItem::query()->where('order_id', $orderId)->firstOrFail()->id;

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/bulk-workshop', [
                'mode' => 'line_prices',
                'line_item_ids' => [$itemId],
                'unit_amount_pence' => 600,
                'confirm_price_change' => false,
            ])
            ->assertStatus(422);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/bulk-workshop', [
                'mode' => 'line_prices',
                'line_item_ids' => [$itemId],
                'unit_amount_pence' => 600,
                'confirm_price_change' => true,
            ])
            ->assertOk();
    }
}
