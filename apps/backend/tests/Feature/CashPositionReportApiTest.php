<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\CostCatalogSeeder;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CashPositionReportApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_route_manager_cannot_view_cash_position_report(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $routeManager = User::factory()->create(['role' => UserRole::RouteManager]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $routeManager->id)
            ->getJson('/api/admin/reports/cash-position')
            ->assertForbidden();
    }

    public function test_developer_can_view_but_not_edit_assumptions(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $developer = User::factory()->create(['role' => UserRole::Developer]);

        $read = $this->withHeader('X-WeSharp-Test-User-Id', (string) $developer->id)
            ->getJson('/api/admin/reports/cash-position');

        $read->assertOk()
            ->assertJsonPath('success', true);

        $purchased = (int) $read->json('data.cash_position.purchased_spend_pence');
        self::assertGreaterThan(50_000, $purchased);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $developer->id)
            ->patchJson('/api/admin/reports/cash-position/assumptions', [
                'starting_capital_pence' => 105_000,
            ])
            ->assertForbidden();
    }

    public function test_finance_user_can_view_and_edit_assumptions_starting_capital_qa_case(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $finance = User::factory()->create(['role' => UserRole::Finance]);

        $read = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/reports/cash-position');

        $read->assertOk();
        $purchased = (int) $read->json('data.cash_position.purchased_spend_pence');

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->patchJson('/api/admin/reports/cash-position/assumptions', [
                'starting_capital_pence' => 105_000,
                'buffer_warning_threshold_pence' => 50_000,
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.assumptions.starting_capital_pence', 105_000);

        $after = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/reports/cash-position');

        $after->assertOk()
            ->assertJsonPath('data.cash_position.starting_capital_pence', 105_000)
            ->assertJsonPath('data.cash_position.cash_buffer_pence', 105_000 - $purchased)
            ->assertJsonPath('data.assumptions.starting_capital_pence', 105_000);

        $warnings = $after->json('data.warnings');
        self::assertIsArray($warnings);
        self::assertContains('buffer_below_threshold', array_column($warnings, 'code'));
    }

    public function test_customer_portal_user_cannot_access_admin_cash_position_route(): void
    {
        $this->seed(WeSharpDemoSeeder::class);
        $portal = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $portal->id)
            ->getJson('/api/admin/reports/cash-position')
            ->assertForbidden();
    }
}
