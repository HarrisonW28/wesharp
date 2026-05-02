<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\BillingInterval;
use App\Enums\SubscriptionStatus;
use App\Enums\UserRole;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\SubscriptionBillingPeriod;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class SubscriptionBillingPeriodApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_renew_billing_period_advances_subscription_and_closes_prior_period(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create(['billing_interval' => BillingInterval::Monthly]);
        $starts = now()->subDays(10)->toDateString();
        $renews = now()->addDay()->toDateString();

        $sub = CompanySubscription::factory()->create([
            'company_id' => $company->id,
            'subscription_plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => $starts,
            'renews_at' => $renews,
        ]);
        SubscriptionBillingPeriod::query()->create([
            'company_subscription_id' => $sub->id,
            'period_index' => 1,
            'starts_on' => $starts,
            'ends_on' => $renews,
            'closed_at' => null,
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $admin->id)->postJson(
            "/api/admin/companies/{$company->id}/subscriptions/{$sub->id}/renew-billing-period",
            [
                'force' => true,
            ],
        );

        $res->assertOk();
        $sub->refresh();
        self::assertSame(SubscriptionStatus::Active, $sub->status);
        self::assertNotSame($renews, $sub->renews_at?->toDateString());

        $closed = SubscriptionBillingPeriod::query()->where('company_subscription_id', $sub->id)->where('period_index', 1)->first();
        self::assertNotNull($closed?->closed_at);

        $open = SubscriptionBillingPeriod::query()->where('company_subscription_id', $sub->id)->whereNull('closed_at')->first();
        self::assertNotNull($open);
        self::assertSame(2, (int) $open->period_index);
    }

    public function test_database_rejects_second_operational_subscription_for_same_company(): void
    {
        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create();

        CompanySubscription::factory()->create([
            'company_id' => $company->id,
            'subscription_plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
        ]);

        $this->expectException(QueryException::class);
        CompanySubscription::factory()->create([
            'company_id' => $company->id,
            'subscription_plan_id' => $plan->id,
            'status' => SubscriptionStatus::PastDue,
        ]);
    }

    public function test_sync_past_due_command_updates_active_rows(): void
    {
        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create();
        $sub = CompanySubscription::factory()->create([
            'company_id' => $company->id,
            'subscription_plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => now()->subMonth()->toDateString(),
            'renews_at' => now()->subDay()->toDateString(),
        ]);

        $this->artisan('subscriptions:sync-past-due')->assertSuccessful();
        $sub->refresh();
        self::assertSame(SubscriptionStatus::PastDue, $sub->status);
    }

    public function test_subscription_dashboard_returns_operational_rows(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create();
        CompanySubscription::factory()->create([
            'company_id' => $company->id,
            'subscription_plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $admin->id)
            ->getJson('/api/admin/subscription-billing/dashboard')
            ->assertOk()
            ->assertJsonPath('data.kpis.operational_subscriptions', 1);
    }
}
