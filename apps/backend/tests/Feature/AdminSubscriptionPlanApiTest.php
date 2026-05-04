<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\BillingInterval;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminSubscriptionPlanApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_can_list_plans(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);
        SubscriptionPlan::factory()->create(['name' => 'Plan A']);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/subscription-plans');

        $res->assertOk()
            ->assertJsonPath('success', true);
        self::assertGreaterThanOrEqual(1, count($res->json('data.items') ?? []));
    }

    public function test_route_manager_cannot_list_plans(): void
    {
        $user = User::factory()->create(['role' => UserRole::RouteManager]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/subscription-plans')
            ->assertForbidden();
    }

    public function test_finance_can_create_update_and_deactivate_plan_with_audit_logs(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);

        $create = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->postJson('/api/admin/subscription-plans', [
            'name' => 'Kitchen Care Monthly',
            'public_name' => 'Chef Programme (marketing)',
            'description' => 'Monthly plan',
            'public_description' => 'Customer-facing blurb.',
            'billing_interval' => BillingInterval::Monthly->value,
            'price_amount_minor' => 9900,
            'currency' => 'gbp',
            'included_collections' => 4,
            'included_knife_allowance' => 40,
            'overage_price_amount_minor' => 800,
            'is_active' => true,
            'sort_order' => 10,
            'show_on_public_site' => true,
            'public_highlights' => ['Swap-outs included', 'Route priority'],
            'public_cta_label' => 'Book this plan',
            'recommended' => true,
        ]);

        $create->assertCreated()
            ->assertJsonPath('data.plan.public_cta_label', 'Book this plan')
            ->assertJsonPath('data.plan.recommended', true)
            ->assertJsonPath('data.plan.public_name', 'Chef Programme (marketing)')
            ->assertJsonPath('data.plan.public_description', 'Customer-facing blurb.');
        self::assertSame(
            ['Swap-outs included', 'Route priority'],
            $create->json('data.plan.public_highlights'),
        );
        $id = (string) $create->json('data.plan.id');
        self::assertNotSame('', $id);

        $update = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->putJson('/api/admin/subscription-plans/'.$id, [
            'name' => 'Kitchen Care Monthly',
            'public_name' => null,
            'description' => 'Monthly plan updated',
            'public_description' => null,
            'billing_interval' => BillingInterval::Monthly->value,
            'price_amount_minor' => 12_000,
            'currency' => 'GBP',
            'included_collections' => 4,
            'included_knife_allowance' => 40,
            'overage_price_amount_minor' => 800,
            'is_active' => true,
            'sort_order' => 10,
            'show_on_public_site' => false,
        ]);

        $update->assertOk()
            ->assertJsonPath('data.plan.price_amount_minor', 12_000)
            ->assertJsonPath('data.plan.public_name', null);

        $deactivate = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->postJson('/api/admin/subscription-plans/'.$id.'/deactivate');

        $deactivate->assertOk()
            ->assertJsonPath('data.plan.is_active', false);

        self::assertTrue(AuditLog::query()->where('action', 'subscription_plan.created')->exists());
        self::assertTrue(AuditLog::query()->where('action', 'subscription_plan.updated')->exists());
        self::assertTrue(AuditLog::query()->where('action', 'subscription_plan.deactivated')->exists());
    }

    public function test_finance_can_archive_plan(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);
        $plan = SubscriptionPlan::factory()->create(['name' => 'To archive']);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->postJson('/api/admin/subscription-plans/'.$plan->id.'/archive')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.archived', true);

        self::assertSoftDeleted('subscription_plans', ['id' => $plan->id]);
        self::assertTrue(AuditLog::query()->where('action', 'subscription_plan.archived')->exists());
    }

    public function test_developer_can_list_plans_but_cannot_archive(): void
    {
        $user = User::factory()->create(['role' => UserRole::Developer]);
        $plan = SubscriptionPlan::factory()->create(['name' => 'Catalog row']);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/subscription-plans')
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->postJson('/api/admin/subscription-plans/'.$plan->id.'/archive')
            ->assertForbidden();
    }
}
