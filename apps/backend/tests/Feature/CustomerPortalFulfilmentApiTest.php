<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\EvidencePhotoVisibility;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CustomerPortalUpdate;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CustomerPortalFulfilmentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_detail_includes_fulfilment_timeline_and_hides_internal_messages(): void
    {
        $company = Company::factory()->create();

        $booking = Booking::factory()->create(['company_id' => $company->id]);

        $order = Order::factory()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
        ]);

        CustomerPortalUpdate::query()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
            'order_id' => $order->id,
            'route_stop_id' => null,
            'body' => 'Internal ops note',
            'visibility' => EvidencePhotoVisibility::InternalOnly,
            'created_by_user_id' => null,
        ]);

        CustomerPortalUpdate::query()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
            'order_id' => $order->id,
            'route_stop_id' => null,
            'body' => 'Your knives are back on the van.',
            'visibility' => EvidencePhotoVisibility::CustomerVisible,
            'created_by_user_id' => null,
        ]);

        $tenant = User::factory()->create([
            'company_id' => $company->id,
            'role' => UserRole::CustomerOwner,
        ]);

        $json = $this->withHeader('X-WeSharp-Test-User-Id', (string) $tenant->id)
            ->getJson('/api/account/orders/'.$order->id)
            ->assertOk()
            ->json('data');

        self::assertArrayHasKey('fulfilment', $json);
        self::assertArrayHasKey('timeline', $json['fulfilment']);
        self::assertGreaterThan(0, count($json['fulfilment']['timeline']));

        self::assertArrayHasKey('customer_messages', $json);
        self::assertCount(1, $json['customer_messages']);
        self::assertSame('Your knives are back on the van.', $json['customer_messages'][0]['body']);
        self::assertArrayNotHasKey('id', $json['customer_messages'][0]);
    }

    public function test_admin_visibility_change_writes_audit(): void
    {
        $company = Company::factory()->create();
        $booking = Booking::factory()->create(['company_id' => $company->id]);
        $order = Order::factory()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
        ]);

        /** @var CustomerPortalUpdate $u */
        $u = CustomerPortalUpdate::query()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
            'order_id' => $order->id,
            'route_stop_id' => null,
            'body' => 'Hello',
            'visibility' => EvidencePhotoVisibility::InternalOnly,
            'created_by_user_id' => null,
        ]);

        $staff = User::factory()->create([
            'role' => UserRole::Admin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $staff->id)
            ->patchJson('/api/admin/customer-portal-updates/'.$u->id, [
                'visibility' => EvidencePhotoVisibility::CustomerVisible->value,
            ])
            ->assertOk();

        self::assertTrue(
            AuditLog::query()->where('action', 'portal_update.visibility_changed')->exists()
        );
    }
}
