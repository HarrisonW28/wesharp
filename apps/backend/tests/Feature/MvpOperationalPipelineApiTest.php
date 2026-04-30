<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\InvoiceStatus;
use App\Enums\KnifeStatus;
use App\Enums\OrderPaymentStatus;
use App\Enums\RouteStopStatus;
use App\Enums\ServiceType;
use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Knife;
use App\Models\Order;
use App\Models\RouteStop;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class MvpOperationalPipelineApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_end_to_end_ops_chain_through_portal_reads(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-29 10:00:00', 'UTC'));

        try {
            $this->seed(WeSharpDemoSeeder::class);

            $today = Carbon::now()->toDateString();

            $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
            $driver = User::query()->where('email', 'driver@demo.wesharp.test')->firstOrFail();
            $opsH = fn (): array => ['X-WeSharp-Test-User-Id' => (string) $ops->id];
            $drvH = fn (): array => ['X-WeSharp-Test-User-Id' => (string) $driver->id];

            $companyRes = $this->withHeaders($opsH())
                ->postJson('/api/admin/companies', [
                    'name' => 'MVP Pipeline Fixtures Ltd',
                    'city' => 'Manchester',
                    'billing_email' => 'mvp-pipeline@test.wesharp',
                ]);

            $companyRes->assertCreated();
            /** @phpstan-ignore-next-line */
            $companyId = (string) $companyRes->json('data.id');

            $locRes = $this->withHeaders($opsH())
                ->postJson('/api/admin/companies/'.$companyId.'/locations', [
                    'label' => 'Primary prep',
                    'line_one' => '1 PHPUnit Row',
                    'city' => 'Manchester',
                    'postcode' => 'M1 1HQ',
                    'country' => 'GB',
                ]);
            $locRes->assertCreated();
            /** @phpstan-ignore-next-line */
            $locationId = (string) $locRes->json('data.id');

            $bookRes = $this->withHeaders($opsH())
                ->postJson('/api/admin/bookings', [
                    'company_id' => $companyId,
                    'location_id' => $locationId,
                    'requested_date' => $today,
                    'service_type' => ServiceType::Collection->value,
                    'internal_notes' => 'MVP PHPUnit pipeline booking',
                    'estimated_knife_count' => 6,
                    'price_estimate' => 10_800,
                ]);
            $bookRes->assertCreated();
            /** @phpstan-ignore-next-line */
            $bookingId = (string) $bookRes->json('data.id');

            $this->withHeaders($opsH())
                ->postJson('/api/admin/bookings/'.$bookingId.'/confirm')
                ->assertOk()
                ->assertJsonPath('data.status', BookingStatus::Confirmed->value);

            $routeRes = $this->withHeaders($opsH())
                ->postJson('/api/admin/routes', [
                    'name' => 'MVP PHPUnit — Manchester '.$today,
                    'scheduled_date' => $today,
                    'coverage_city' => 'Manchester',
                    'driver_user_id' => (int) $driver->id,
                ]);
            $routeRes->assertCreated();
            /** @phpstan-ignore-next-line */
            $routeId = (string) $routeRes->json('data.id');

            $assignRes = $this->withHeaders($opsH())
                ->postJson('/api/admin/bookings/'.$bookingId.'/assign-route', [
                    'route_id' => $routeId,
                ]);
            $assignRes->assertOk()
                ->assertJsonPath('data.status', BookingStatus::AssignedToRoute->value);

            $todayRes = $this->withHeaders($drvH())
                ->getJson('/api/admin/routes/today');
            $todayRes->assertOk();
            /** @phpstan-ignore-next-line */
            self::assertSame($routeId, (string) $todayRes->json('data.primary_route.id'));

            /** @phpstan-ignore-next-line */
            $stopId = RouteStop::query()->where('booking_id', $bookingId)->firstOrFail()->id;

            foreach (['mark-travelling', 'mark-arrived', 'mark-collected'] as $path) {
                $this->withHeaders($drvH())
                    ->postJson('/api/admin/route-stops/'.$stopId.'/'.$path, [])
                    ->assertOk();
            }

            /** @phpstan-ignore-next-line */
            self::assertSame(
                RouteStopStatus::Collected,
                RouteStop::query()->find($stopId)?->route_stop_status
            );

            $convertRes = $this->withHeaders($opsH())
                ->postJson('/api/admin/bookings/'.$bookingId.'/convert-to-order', []);
            $convertRes->assertCreated();
            /** @phpstan-ignore-next-line */
            self::assertSame(
                BookingStatus::ConvertedToOrder,
                Booking::query()->find($bookingId)?->booking_status
            );
            /** @phpstan-ignore-next-line */
            $orderId = (string) $convertRes->json('data.order_id');

            $bulk = $this->withHeaders($opsH())
                ->postJson('/api/admin/orders/'.$orderId.'/bulk-add-knives', [
                    'count' => 5,
                    'description_prefix' => 'Edge test',
                    'knife_type' => 'chef',
                ]);
            $bulk->assertOk();
            /** @phpstan-ignore-next-line */
            $knifeIds = $bulk->json('data.knife_ids');

            /** @phpstan-ignore-next-line */
            self::assertCount(5, $knifeIds);
            $knifeId = (string) $knifeIds[0];

            foreach (['mark-inspected', 'mark-sharpened', 'mark-quality-checked', 'mark-returned'] as $path) {
                $this->withHeaders($opsH())
                    ->postJson('/api/admin/knives/'.$knifeId.'/'.$path, [])
                    ->assertOk();
            }

            /** @phpstan-ignore-next-line */
            self::assertSame(
                KnifeStatus::Returned,
                Knife::query()->find($knifeId)?->knife_status
            );

            $invRes = $this->withHeaders($opsH())
                ->postJson('/api/admin/invoices', ['order_id' => $orderId]);
            $invRes->assertCreated();
            /** @phpstan-ignore-next-line */
            $invoiceId = (string) $invRes->json('data.id');

            /** @phpstan-ignore-next-line */
            self::assertSame(
                InvoiceStatus::Draft->value,
                Invoice::query()->find($invoiceId)?->invoice_status->value ?? null
            );

            $paidRes = $this->withHeaders($opsH())
                ->postJson('/api/admin/invoices/'.$invoiceId.'/mark-paid', []);
            $paidRes->assertOk()
                ->assertJsonPath('data.status', InvoiceStatus::Paid->value);

            /** @phpstan-ignore-next-line */
            self::assertSame(
                OrderPaymentStatus::Paid,
                Order::query()->find($orderId)?->fresh()->payment_status
            );

            $portalEmail = 'kitchen.portal@demo.wesharp.test';
            User::query()->where('email', $portalEmail)->update(['company_id' => $companyId]);
            /** @phpstan-ignore-next-line */
            $portal = User::query()->where('email', $portalEmail)->firstOrFail();

            $tH = ['X-WeSharp-Test-User-Id' => (string) $portal->id];

            $this->withHeaders($tH)->getJson('/api/account/dashboard')->assertOk()->assertJsonPath('success', true);

            $orderDetail = $this->withHeaders($tH)->getJson('/api/account/orders/'.$orderId)->assertOk();
            /** @phpstan-ignore-next-line */
            $orderDetail->assertJsonPath('data.id', $orderId);
            /** @phpstan-ignore-next-line */
            $payload = $orderDetail->json('data');
            self::assertIsArray($payload);
            self::assertArrayNotHasKey('company_id', $payload);
            self::assertArrayNotHasKey('booking_id', $payload);
            self::assertArrayNotHasKey('route_id', $payload);
            self::assertArrayHasKey('display_reference', $payload);

            $listInvoices = $this->withHeaders($tH)->getJson('/api/account/invoices?per_page=50');
            $listInvoices->assertOk();

            /** @phpstan-ignore-next-line */
            $invoiceIdsOnPage = collect($listInvoices->json('data.items'))->pluck('id')->all();
            /** @phpstan-ignore-next-line */
            self::assertContains($invoiceId, $invoiceIdsOnPage);

            $peerInvoice = Invoice::query()->where('company_id', '!=', $companyId)->firstOrFail();

            $wide = $this->withHeaders($tH)->getJson('/api/account/invoices?per_page=100');
            $wide->assertOk();
            /** @phpstan-ignore-next-line */
            $allIds = collect($wide->json('data.items'))->pluck('id')->all();
            /** @phpstan-ignore-next-line */
            self::assertNotContains((string) $peerInvoice->id, $allIds);

            $invDetail = $this->withHeaders($tH)->getJson('/api/account/invoices/'.$invoiceId)->assertOk();
            /** @phpstan-ignore-next-line */
            $invPayload = $invDetail->json('data');
            self::assertIsArray($invPayload);
            self::assertArrayNotHasKey('company_id', $invPayload);
            self::assertArrayNotHasKey('order_id', $invPayload);
            self::assertArrayHasKey('display_reference', $invPayload);
            self::assertArrayHasKey('items', $invPayload);
        } finally {
            Carbon::setTestNow();
        }
    }
}
