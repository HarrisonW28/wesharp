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

    public function test_public_subscription_plans_endpoint_lists_only_marketed_active_plans(): void
    {
        SubscriptionPlan::factory()->create([
            'name' => 'SoftDeleted',
            'show_on_public_site' => true,
            'is_active' => true,
        ])->delete();

        SubscriptionPlan::factory()->create([
            'name' => 'Listed',
            'show_on_public_site' => true,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $res = $this->getJson('/api/public/subscription-plans');
        $res->assertOk();
        $items = $res->json('data.items');
        self::assertIsArray($items);
        $names = collect($items)->pluck('name')->all();
        self::assertContains('Listed', $names);
        self::assertNotContains('SoftDeleted', $names);
    }

    public function test_recommended_plans_order_before_others_at_same_sort_order(): void
    {
        SubscriptionPlan::factory()->create([
            'name' => 'Standard',
            'show_on_public_site' => true,
            'is_active' => true,
            'recommended' => false,
            'sort_order' => 0,
        ]);
        SubscriptionPlan::factory()->create([
            'name' => 'Hero',
            'show_on_public_site' => true,
            'is_active' => true,
            'recommended' => true,
            'sort_order' => 0,
        ]);

        $res = $this->getJson('/api/public/subscription-plans');
        $res->assertOk();
        self::assertSame(
            ['Hero', 'Standard'],
            collect($res->json('data.items'))->pluck('name')->all()
        );
    }

    public function test_public_site_content_subscription_plans_match_catalog_excluding_soft_deleted(): void
    {
        SubscriptionPlan::factory()->create([
            'name' => 'Deleted Public',
            'show_on_public_site' => true,
            'is_active' => true,
        ])->delete();
        SubscriptionPlan::factory()->create([
            'name' => 'Live',
            'show_on_public_site' => true,
            'is_active' => true,
        ]);

        $site = $this->getJson('/api/public/site-content');
        $plans = $this->getJson('/api/public/subscription-plans');
        $site->assertOk();
        $plans->assertOk();

        self::assertSame(
            collect($plans->json('data.items'))->pluck('id')->sort()->values()->all(),
            collect($site->json('data.public_subscription_plans'))->pluck('id')->sort()->values()->all(),
        );
        $names = collect($site->json('data.public_subscription_plans'))->pluck('name')->all();
        self::assertContains('Live', $names);
        self::assertNotContains('Deleted Public', $names);
    }

    public function test_public_catalog_uses_public_name_and_public_description_when_set(): void
    {
        SubscriptionPlan::factory()->create([
            'name' => 'Internal SKU-99',
            'public_name' => 'Kitchen Plus',
            'description' => 'Internal notes only.',
            'public_description' => 'Rolling visits for busy teams.',
            'show_on_public_site' => true,
            'is_active' => true,
            'sort_order' => 0,
        ]);

        $res = $this->getJson('/api/public/subscription-plans');
        $res->assertOk();
        $items = $res->json('data.items');
        self::assertIsArray($items);
        $hit = collect($items)->firstWhere('name', 'Kitchen Plus');
        self::assertNotNull($hit);
        self::assertSame('Rolling visits for busy teams.', $hit['description']);
        self::assertNotSame('Internal SKU-99', $hit['name']);
    }
}
