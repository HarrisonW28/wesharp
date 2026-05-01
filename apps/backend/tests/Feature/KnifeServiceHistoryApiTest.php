<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\OrderStatus;
use App\Enums\ServiceType;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\Knife;
use App\Models\KnifeServiceAssignment;
use App\Models\Order;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class KnifeServiceHistoryApiTest extends TestCase
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

    private function createSecondOrder(User $ops, Company $company): string
    {
        $location = CompanyLocation::query()->where('company_id', $company->id)->firstOrFail();
        /** @phpstan-ignore-next-line */
        $booking = Booking::query()->create([
            'company_id' => $company->id,
            'company_location_id' => $location->id,
            'booking_status' => BookingStatus::Confirmed,
            'service_type' => ServiceType::Collection,
            /** @phpstan-ignore-next-line */
            'scheduled_date' => now()->addDays(2)->toDateString(),
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
        return (string) $orderRes->json('data.id');
    }

    public function test_resharpening_closes_prior_assignment_and_keeps_history(): void
    {
        ['ops' => $ops, 'orderId' => $order1, 'company' => $company] = $this->seedOrder();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$order1.'/bulk-order-items', [
                'items' => [
                    [
                        'knife_type' => 'chefs',
                        'label' => 'History blade',
                        'quantity' => 1,
                        'unit_amount_pence' => 500,
                    ],
                ],
            ])->assertOk();

        /** @phpstan-ignore-next-line */
        $knifeId = (string) Knife::query()->where('order_id', $order1)->firstOrFail()->id;

        self::assertSame(1, KnifeServiceAssignment::query()->where('knife_id', $knifeId)->count());

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$order1.'/complete', [])
            ->assertOk();

        $order2 = $this->createSecondOrder($ops, $company);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$order2.'/attach-knife', ['knife_id' => $knifeId])
            ->assertCreated();

        self::assertSame(2, KnifeServiceAssignment::query()->where('knife_id', $knifeId)->count());
        self::assertSame(1, KnifeServiceAssignment::query()->where('knife_id', $knifeId)->whereNotNull('unlinked_at')->count());
        self::assertSame(1, KnifeServiceAssignment::query()->where('knife_id', $knifeId)->whereNull('unlinked_at')->count());

        $detail = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->getJson('/api/admin/knives/'.$knifeId);
        $detail->assertOk();
        self::assertCount(2, (array) $detail->json('data.service_history'));

        /** @phpstan-ignore-next-line */
        $knife = Knife::query()->findOrFail($knifeId);
        self::assertSame($order2, (string) $knife->order_id);
    }

    public function test_attach_rejects_knife_on_active_order(): void
    {
        ['ops' => $ops, 'orderId' => $order1, 'company' => $company] = $this->seedOrder();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$order1.'/bulk-order-items', [
                'items' => [
                    [
                        'knife_type' => 'chefs',
                        'label' => 'Active blade',
                        'quantity' => 1,
                        'unit_amount_pence' => 400,
                    ],
                ],
            ])->assertOk();

        /** @phpstan-ignore-next-line */
        $knifeId = (string) Knife::query()->where('order_id', $order1)->firstOrFail()->id;

        $order2 = $this->createSecondOrder($ops, $company);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson('/api/admin/orders/'.$order2.'/attach-knife', ['knife_id' => $knifeId])
            ->assertStatus(422);
    }

    public function test_account_knife_detail_is_scoped_to_tenant_company(): void
    {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();

        /** @phpstan-ignore-next-line */
        $bookingA = Booking::factory()->create(['company_id' => $companyA->id]);
        /** @phpstan-ignore-next-line */
        $orderA = Order::factory()->create([
            'company_id' => $companyA->id,
            'booking_id' => $bookingA->id,
            'order_status' => OrderStatus::Completed,
        ]);

        /** @phpstan-ignore-next-line */
        $knife = Knife::factory()->create([
            'company_id' => $companyA->id,
            'booking_id' => $bookingA->id,
            'order_id' => $orderA->id,
        ]);

        KnifeServiceAssignment::query()->create([
            'knife_id' => $knife->id,
            'order_id' => $orderA->id,
            'company_id' => $companyA->id,
            'service_kind' => \App\Enums\KnifeServiceKind::Intake,
            'linked_at' => now()->subDay(),
            'unlinked_at' => null,
        ]);

        /** @phpstan-ignore-next-line */
        $tenantB = User::factory()->create([
            'company_id' => $companyB->id,
            'role' => UserRole::CustomerOwner,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $tenantB->id)
            ->getJson('/api/account/knives/'.$knife->id)
            ->assertForbidden();
    }
}
