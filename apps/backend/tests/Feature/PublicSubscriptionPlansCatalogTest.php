<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\SubscriptionPlan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class PublicSubscriptionPlansCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_site_content_includes_only_active_marketed_plans(): void
    {
        SubscriptionPlan::factory()->create([
            'name' => 'Hidden',
            'show_on_public_site' => false,
            'is_active' => true,
        ]);
        SubscriptionPlan::factory()->create([
            'name' => 'Inactive Public',
            'show_on_public_site' => true,
            'is_active' => false,
        ]);
        SubscriptionPlan::factory()->create([
            'name' => 'Visible',
            'show_on_public_site' => true,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $res = $this->getJson('/api/public/site-content');
        $res->assertOk();

        $items = $res->json('data.public_subscription_plans');
        self::assertIsArray($items);
        $names = collect($items)->pluck('name')->all();
        self::assertContains('Visible', $names);
        self::assertNotContains('Hidden', $names);
        self::assertNotContains('Inactive Public', $names);
    }
}
