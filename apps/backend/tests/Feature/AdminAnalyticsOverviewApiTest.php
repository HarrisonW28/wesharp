<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminAnalyticsOverviewApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_overview_returns_success_envelope(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->getJson('/api/admin/analytics/overview');

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data',
            ])
            ->assertJsonStructure([
                'data' => [
                    'kpis' => [
                        'revenue_this_month_pence',
                        'invoiced_subscription_total_pence_in_range',
                        'invoiced_overage_line_pence_in_range',
                        'completed_orders_in_filter_range',
                        'average_knives_per_completed_order_in_range',
                    ],
                ],
            ]);
    }
}
