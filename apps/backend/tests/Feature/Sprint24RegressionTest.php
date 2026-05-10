<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Company;
use App\Models\User;
use Database\Seeders\CostCatalogSeeder;
use Database\Seeders\FinanceForecastScenarioSeeder;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

/**
 * Sprint 24.7 — consolidated regression smoke for advanced finance reporting surfaces.
 *
 * @see docs/roadmap/sprint-24.md §24.7
 */
final class Sprint24RegressionTest extends TestCase
{
    use RefreshDatabase;

    private static function assertLooksLikeGbp(?string $formatted): void
    {
        self::assertIsString($formatted);
        self::assertMatchesRegularExpression('/£|GBP/', $formatted);
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CostCatalogSeeder::class);
        $this->seed(FinanceForecastScenarioSeeder::class);
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_route_manager_is_blocked_from_sprint_24_finance_apis(): void
    {
        $routeManager = User::factory()->create(['role' => UserRole::RouteManager]);

        $blockedPaths = [
            '/api/admin/reports/cash-position',
            '/api/admin/reports/subscription-profitability',
            '/api/admin/reports/forecast-scenarios',
            '/api/admin/reports/sales-performance',
            '/api/admin/reports/executive-dashboard',
        ];

        foreach ($blockedPaths as $path) {
            $this->withHeader('X-WeSharp-Test-User-Id', (string) $routeManager->id)
                ->getJson($path)
                ->assertForbidden();
        }

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $routeManager->id)
            ->getJson('/api/admin/reports/route-profitability')
            ->assertOk();
    }

    public function test_finance_user_sprint_24_core_reports_and_crm_finance_intelligence(): void
    {
        Config::set('stripe.hosted_checkout_enabled', false);

        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();
        $hdr = ['X-WeSharp-Test-User-Id' => (string) $finance->id];

        $cash = $this->withHeaders($hdr)->getJson('/api/admin/reports/cash-position')->assertOk()->json('data');
        self::assertArrayHasKey('cash_position', $cash);
        self::assertArrayHasKey('warnings', $cash);
        self::assertArrayHasKey('assumptions', $cash);
        $buf = $cash['cash_position']['formatted_cash_buffer'] ?? null;
        if (is_string($buf)) {
            self::assertLooksLikeGbp($buf);
        }

        $sub = $this->withHeaders($hdr)->getJson('/api/admin/reports/subscription-profitability')->assertOk()->json('data');
        self::assertArrayHasKey('kpis', $sub);
        self::assertLooksLikeGbp((string) ($sub['kpis']['formatted_subscription_line_revenue_period'] ?? '£0.00'));

        $this->withHeaders($hdr)->getJson('/api/admin/reports/forecast-scenarios')->assertOk()->assertJsonPath('success', true);

        $route = $this->withHeaders($hdr)->getJson('/api/admin/reports/route-profitability')->assertOk()->json('data');
        self::assertArrayHasKey('kpis', $route);
        self::assertLooksLikeGbp((string) ($route['kpis']['formatted_total_route_margin'] ?? '£0.00'));

        $sales = $this->withHeaders($hdr)->getJson('/api/admin/reports/sales-performance')->assertOk()->json('data');
        self::assertArrayHasKey('kpis', $sales);
        self::assertLooksLikeGbp((string) ($sales['kpis']['formatted_pos_like_revenue'] ?? '£0.00'));

        $exec = $this->withHeaders($hdr)->getJson('/api/admin/reports/executive-dashboard')->assertOk()->json('data');
        self::assertArrayHasKey('kpis', $exec);
        self::assertArrayHasKey('alerts', $exec);
        self::assertLooksLikeGbp((string) ($exec['kpis']['formatted_revenue_this_month'] ?? '£0.00'));
        self::assertTrue(
            isset($exec['kpis']['roi_cash_proxy_ratio']) || isset($exec['kpis']['formatted_roi_cash_proxy']),
            'Executive dashboard should expose ROI proxy fields.',
        );

        $company = Company::query()->firstOrFail();
        $crm = $this->withHeaders($hdr)->getJson('/api/admin/companies/'.$company->id)->assertOk()->json('data');
        self::assertArrayHasKey('finance_intelligence', $crm);
        self::assertNotNull($crm['finance_intelligence']);
        $fi = $crm['finance_intelligence'];
        self::assertIsArray($fi);
        self::assertLooksLikeGbp((string) ($fi['formatted_total_invoiced'] ?? '£0.00'));
    }
}
