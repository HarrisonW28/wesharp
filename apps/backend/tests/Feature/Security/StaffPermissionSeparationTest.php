<?php

namespace Tests\Feature\Security;

use App\Models\Invoice;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class StaffPermissionSeparationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_route_manager_cannot_record_manual_payment(): void
    {
        $routeManager = User::query()->where('email', 'driver@demo.wesharp.test')->firstOrFail();
        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();

        /** @phpstan-ignore-next-line */
        $invoiceId = Invoice::query()->firstOrFail()->id;

        $blocked = $this->withHeader('X-WeSharp-Test-User-Id', (string) $routeManager->id)
            ->postJson('/api/admin/payments/manual', [
                'invoice_id' => $invoiceId,
                'amount_pence' => 50,
                'payment_method' => 'bank_transfer',
            ]);

        $blocked->assertForbidden();

        $allowed = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/payments/manual', [
                'invoice_id' => $invoiceId,
                'amount_pence' => 50,
                'payment_method' => 'bank_transfer',
            ]);

        self::assertNotSame(403, $allowed->status());
    }

    public function test_finance_cannot_create_route_manifest(): void
    {
        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();

        $response = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/routes', [
                'name' => 'Security probe route',
                'scheduled_date' => now()->addDay()->toDateString(),
                'coverage_city' => 'Manchester',
            ]);

        $response->assertForbidden();
    }

    public function test_route_manager_can_create_route_manifest(): void
    {
        $routeManager = User::query()->where('email', 'driver@demo.wesharp.test')->firstOrFail();

        $response = $this->withHeader('X-WeSharp-Test-User-Id', (string) $routeManager->id)
            ->postJson('/api/admin/routes', [
                'name' => 'Allowlisted route',
                'scheduled_date' => now()->addDay()->toDateString(),
                'coverage_city' => 'Manchester',
            ]);

        $response->assertCreated();
    }
}
