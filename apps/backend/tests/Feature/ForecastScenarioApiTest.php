<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\FinanceForecastScenario;
use App\Models\User;
use Database\Seeders\CostCatalogSeeder;
use Database\Seeders\FinanceForecastScenarioSeeder;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ForecastScenarioApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_user_lists_presets_and_sees_forecast_outputs(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $this->seed(FinanceForecastScenarioSeeder::class);

        $finance = User::factory()->create(['role' => UserRole::Finance]);

        $list = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/reports/forecast-scenarios');

        $list->assertOk()
            ->assertJsonPath('success', true);

        self::assertGreaterThanOrEqual(3, count($list->json('data.scenarios')));

        /** @var FinanceForecastScenario $scenario */
        $scenario = FinanceForecastScenario::query()->where('preset_key', 'expected')->firstOrFail();

        $show = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/reports/forecast-scenarios/'.$scenario->id);

        $show->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'scenario',
                    'forecast' => [
                        'definitions',
                        'outputs' => [
                            'weekly_revenue_pence',
                            'monthly_revenue_pence',
                            'monthly_recurring_revenue_pence',
                            'gross_profit_pence',
                            'net_profit_estimate_pence',
                            'monthly_costs_pence',
                            'break_even_month_number',
                            'cash_low_point_pence',
                            'knives_needed_to_break_even_monthly',
                            'route_days_per_week_needed_to_break_even',
                        ],
                    ],
                    'roi_payback' => [
                        'buckets' => [
                            'equipment',
                            'startup',
                            'marketing',
                            'recurring_commitments',
                        ],
                        'portfolio',
                    ],
                ],
            ]);
    }

    public function test_developer_can_read_but_not_mutate_scenarios(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $this->seed(FinanceForecastScenarioSeeder::class);

        $developer = User::factory()->create(['role' => UserRole::Developer]);
        $scenario = FinanceForecastScenario::query()->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $developer->id)
            ->getJson('/api/admin/reports/forecast-scenarios/'.$scenario->id)
            ->assertOk();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $developer->id)
            ->postJson('/api/admin/reports/forecast-scenarios', [
                'name' => 'Probe',
                'scenario_type' => 'custom',
                'inputs' => ['route_days_per_week' => 2],
            ])
            ->assertForbidden();
    }

    public function test_finance_can_create_and_delete_custom_scenario_but_not_presets(): void
    {
        $this->seed(CostCatalogSeeder::class);
        $this->seed(FinanceForecastScenarioSeeder::class);

        $finance = User::factory()->create(['role' => UserRole::Finance]);
        $preset = FinanceForecastScenario::query()->where('preset_key', 'conservative')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->deleteJson('/api/admin/reports/forecast-scenarios/'.$preset->id)
            ->assertStatus(422);

        $created = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/reports/forecast-scenarios', [
                'name' => 'QA custom',
                'scenario_type' => 'custom',
                'inputs' => [
                    'route_days_per_week' => 2,
                    'average_price_per_knife_pence' => 900,
                ],
            ]);

        $created->assertCreated()
            ->assertJsonPath('success', true);

        $id = (string) $created->json('data.scenario.id');

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->deleteJson('/api/admin/reports/forecast-scenarios/'.$id)
            ->assertOk();
    }

    public function test_customer_cannot_access_forecast_api(): void
    {
        $this->seed(WeSharpDemoSeeder::class);
        $scenario = FinanceForecastScenario::query()->firstOrFail();

        $portal = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $portal->id)
            ->getJson('/api/admin/reports/forecast-scenarios/'.$scenario->id)
            ->assertForbidden();
    }
}
