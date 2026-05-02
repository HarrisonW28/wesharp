<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\BillingInterval;
use App\Enums\PricingRuleKind;
use App\Enums\ServiceType;
use App\Models\PricingRule;
use App\Models\ServiceArea;
use App\Models\SubscriptionPlan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

final class PublicPricingEstimateApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_pay_as_you_go_uses_matching_per_knife_rule(): void
    {
        $area = ServiceArea::factory()->create([
            'postcode_prefix' => 'M',
            'active' => true,
        ]);

        PricingRule::factory()->create([
            'service_area_id' => $area->id,
            'name' => 'Collection per blade',
            'service_type' => ServiceType::Collection,
            'rule_kind' => PricingRuleKind::PerKnife,
            'priority' => 10,
            'amount_pence' => 850,
            'constraints' => ['minimum_units' => 5],
            'active' => true,
        ]);

        $response = $this->postJson('/api/public/pricing-estimate', [
            'knife_count' => 12,
            'postcode' => 'M1 1AA',
            'programme_mode' => 'pay_as_you_go',
            'service_type' => 'collection',
            'visit_pattern' => 'single',
            'customer_kind' => 'home',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.programme_mode', 'pay_as_you_go')
            ->assertJsonPath('data.amount_pence', 12 * 850)
            ->assertJsonPath('data.pricing_rule_name', 'Collection per blade');
    }

    public function test_subscription_picks_smallest_allowance_that_covers_knives(): void
    {
        if (! Schema::hasColumn('subscription_plans', 'show_on_public_site')) {
            self::markTestSkipped('subscription_plans.show_on_public_site not migrated.');
        }

        SubscriptionPlan::factory()->create([
            'name' => 'Large',
            'included_knife_allowance' => 40,
            'price_amount_minor' => 20000,
            'overage_price_amount_minor' => 900,
            'billing_interval' => BillingInterval::Monthly,
            'is_active' => true,
            'show_on_public_site' => true,
            'sort_order' => 2,
        ]);

        SubscriptionPlan::factory()->create([
            'name' => 'Compact',
            'included_knife_allowance' => 10,
            'price_amount_minor' => 6500,
            'overage_price_amount_minor' => 700,
            'billing_interval' => BillingInterval::Monthly,
            'is_active' => true,
            'show_on_public_site' => true,
            'sort_order' => 1,
        ]);

        $response = $this->postJson('/api/public/pricing-estimate', [
            'knife_count' => 8,
            'postcode' => 'M1 1AA',
            'programme_mode' => 'subscription',
            'service_type' => 'collection',
            'visit_pattern' => 'regular',
            'customer_kind' => 'business',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.programme_mode', 'subscription')
            ->assertJsonPath('data.suggested_package_label', 'Compact')
            ->assertJsonPath('data.amount_pence', 6500);
    }

    public function test_pricing_estimate_throttle_returns_429(): void
    {
        $area = ServiceArea::factory()->create([
            'postcode_prefix' => 'M',
            'active' => true,
        ]);

        PricingRule::factory()->create([
            'service_area_id' => $area->id,
            'service_type' => ServiceType::Collection,
            'rule_kind' => PricingRuleKind::PerKnife,
            'amount_pence' => 100,
            'constraints' => [],
            'active' => true,
        ]);

        $payload = [
            'knife_count' => 2,
            'postcode' => 'M1 1AA',
            'programme_mode' => 'pay_as_you_go',
            'service_type' => 'collection',
            'visit_pattern' => 'single',
            'customer_kind' => 'home',
        ];

        for ($i = 0; $i < 30; $i++) {
            $this->postJson('/api/public/pricing-estimate', $payload)->assertOk();
        }

        $this->postJson('/api/public/pricing-estimate', $payload)->assertStatus(429);
    }
}
