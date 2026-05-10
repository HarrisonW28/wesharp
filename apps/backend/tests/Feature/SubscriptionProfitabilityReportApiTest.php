<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\CostCatalogSeeder;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class SubscriptionProfitabilityReportApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_route_manager_cannot_view_subscription_profitability_report(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $routeManager = User::factory()->create(['role' => UserRole::RouteManager]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $routeManager->id)
            ->getJson('/api/admin/reports/subscription-profitability')
            ->assertForbidden();
    }

    public function test_developer_with_costs_view_can_view_report(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $developer = User::factory()->create(['role' => UserRole::Developer]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $developer->id)
            ->getJson('/api/admin/reports/subscription-profitability')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'definitions',
                    'filters_applied',
                    'kpis',
                    'recurring_revenue_context',
                    'split_for_rules',
                    'companies',
                    'flags',
                    'disclaimer',
                ],
            ]);
    }

    public function test_customer_portal_user_cannot_access_subscription_profitability_route(): void
    {
        $this->seed(WeSharpDemoSeeder::class);
        $portal = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $portal->id)
            ->getJson('/api/admin/reports/subscription-profitability')
            ->assertForbidden();
    }
}
