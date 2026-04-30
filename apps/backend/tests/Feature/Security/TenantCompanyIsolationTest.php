<?php

namespace Tests\Feature\Security;

use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class TenantCompanyIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_cannot_read_peer_company_order(): void
    {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();

        CompanyLocation::factory()->create(['company_id' => $companyB->id]);

        /** @phpstan-ignore-next-line */
        $bookingB = Booking::factory()->create(['company_id' => $companyB->id]);

        /** @phpstan-ignore-next-line */
        $orderB = Order::factory()->create([
            'company_id' => $companyB->id,
            'booking_id' => $bookingB->id,
        ]);

        /** @phpstan-ignore-next-line */
        $tenant = User::factory()->create([
            'company_id' => $companyA->id,
            'role' => UserRole::CustomerOwner,
        ]);

        $response = $this->withHeader('X-WeSharp-Test-User-Id', (string) $tenant->id)
            ->getJson('/api/account/orders/'.$orderB->id);

        $response->assertForbidden();
    }

    public function test_customer_cannot_read_peer_company_invoice(): void
    {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();

        /** @phpstan-ignore-next-line */
        $orderB = Order::factory()->create(['company_id' => $companyB->id]);

        /** @phpstan-ignore-next-line */
        $invoiceB = Invoice::factory()->create([
            'company_id' => $companyB->id,
            'order_id' => $orderB->id,
        ]);

        /** @phpstan-ignore-next-line */
        $tenant = User::factory()->create([
            'company_id' => $companyA->id,
            'role' => UserRole::CustomerOwner,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $tenant->id)
            ->getJson('/api/account/invoices/'.$invoiceB->id)
            ->assertForbidden();
    }
}
