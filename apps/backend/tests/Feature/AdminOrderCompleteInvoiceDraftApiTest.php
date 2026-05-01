<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\OrderStatus;
use App\Enums\ServiceType;
use App\Enums\InvoiceSourceType;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminOrderCompleteInvoiceDraftApiTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{ops: User, orderId: string} */
    private function seedEmptyOrder(): array
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

        return ['ops' => $ops, 'orderId' => $orderId];
    }

    public function test_complete_rejects_order_with_no_items_and_no_knives(): void
    {
        ['ops' => $ops, 'orderId' => $orderId] = $this->seedEmptyOrder();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/complete', []);

        $res->assertStatus(422);
        $msg = (string) ($res->json('message') ?? $res->json('error.message') ?? '');
        self::assertStringContainsString('order line', $msg);
    }

    public function test_complete_sets_completed_at_and_audit_when_lines_exist(): void
    {
        ['ops' => $ops, 'orderId' => $orderId] = $this->seedEmptyOrder();

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

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/complete', []);

        $res->assertOk()->assertJsonPath('data.status', OrderStatus::Completed->value);
        self::assertNotNull($res->json('data.completed_at'));

        /** @phpstan-ignore-next-line */
        $order = Order::query()->findOrFail($orderId);
        self::assertNotNull($order->completed_at);
        self::assertTrue(
            AuditLog::query()
                ->where('action', 'order.completed')
                /** @phpstan-ignore-next-line */
                ->where('auditable_id', $orderId)
                ->exists()
        );
    }

    public function test_invoice_draft_requires_completed_order(): void
    {
        ['ops' => $ops, 'orderId' => $orderId] = $this->seedEmptyOrder();

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

        $blocked = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/invoice-draft', []);

        $blocked->assertStatus(422);
    }

    public function test_invoice_draft_creates_once_and_reuses(): void
    {
        ['ops' => $ops, 'orderId' => $orderId] = $this->seedEmptyOrder();

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

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/complete', [])
            ->assertOk();

        $first = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/invoice-draft', []);

        $first->assertOk()
            ->assertJsonPath('data.already_existed', false)
            ->assertJsonPath('data.invoice.status', 'draft');

        self::assertTrue(
            AuditLog::query()->where('action', 'invoice.draft_generated')->exists()
        );

        $invoiceId = (string) $first->json('data.invoice.id');
        self::assertNotEmpty($invoiceId);

        /** @phpstan-ignore-next-line */
        $row = Invoice::query()->findOrFail($invoiceId);
        self::assertSame(InvoiceSourceType::Order->value, $row->source_type);
        self::assertSame((string) $orderId, (string) $row->source_id);

        $second = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/invoice-draft', []);

        $second->assertOk()
            ->assertJsonPath('data.already_existed', true)
            ->assertJsonPath('data.invoice.id', $invoiceId);

        self::assertSame(1, Invoice::query()->where('order_id', $orderId)->count());
    }

    public function test_order_show_includes_invoice_summary_when_present(): void
    {
        ['ops' => $ops, 'orderId' => $orderId] = $this->seedEmptyOrder();

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

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/complete', [])
            ->assertOk();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$orderId.'/invoice-draft', [])
            ->assertOk();

        $show = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->getJson('/api/admin/orders/'.$orderId);

        $show->assertOk()->assertJsonPath('data.invoice.status', 'draft');
        self::assertIsInt($show->json('data.invoice.subtotal_pence'));
    }
}
