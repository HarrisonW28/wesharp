<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ExecutiveFinanceDashboardApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_route_manager_cannot_view_executive_dashboard(): void
    {
        $routeManager = User::factory()->create(['role' => UserRole::RouteManager]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $routeManager->id)
            ->getJson('/api/admin/reports/executive-dashboard')
            ->assertForbidden();
    }

    public function test_finance_user_receives_executive_dashboard_payload(): void
    {
        $finance = User::factory()->create(['role' => UserRole::Finance]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/reports/executive-dashboard')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'definitions',
                    'filters_applied',
                    'periods',
                    'sections',
                    'kpis',
                    'forecast_links',
                    'alerts',
                    'disclaimer',
                ],
            ]);
    }

    public function test_developer_can_view_executive_dashboard(): void
    {
        $developer = User::factory()->create(['role' => UserRole::Developer]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $developer->id)
            ->getJson('/api/admin/reports/executive-dashboard')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_customer_portal_user_cannot_access_executive_dashboard(): void
    {
        $this->seed(WeSharpDemoSeeder::class);
        $portal = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $portal->id)
            ->getJson('/api/admin/reports/executive-dashboard')
            ->assertForbidden();
    }
}
