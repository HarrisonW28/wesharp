<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminFinanceDashboardApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_route_manager_forbidden(): void
    {
        $this->seed(WeSharpDemoSeeder::class);
        $driver = User::query()->where('email', 'driver@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $driver->id)
            ->getJson('/api/admin/finance/dashboard')
            ->assertForbidden();
    }

    public function test_finance_user_receives_dashboard_payload(): void
    {
        $this->seed(WeSharpDemoSeeder::class);
        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/finance/dashboard');

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'period',
                    'filters_applied',
                    'kpis' => [
                        'unpaid_invoice_count',
                        'overdue_invoice_count',
                        'draft_invoice_count',
                        'void_invoice_count_period',
                        'outstanding_pence',
                        'formatted_outstanding',
                        'paid_in_period_pence',
                        'formatted_paid_in_period',
                        'payment_count_in_period',
                        'subscription_tagged_payments_in_period_pence',
                        'formatted_subscription_tagged_payments_in_period',
                    ],
                    'subscription',
                    'integrations',
                    'overdue_invoices',
                    'draft_invoices',
                    'recent_payments',
                    'top_outstanding_companies',
                ],
            ]);
    }

    public function test_empty_database_returns_zeros(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::Finance,
            'email' => 'finance-empty@example.test',
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/finance/dashboard');

        $res->assertOk()
            ->assertJsonPath('data.kpis.unpaid_invoice_count', 0)
            ->assertJsonPath('data.kpis.outstanding_pence', 0)
            ->assertJsonPath('data.kpis.paid_in_period_pence', 0);
    }
}
