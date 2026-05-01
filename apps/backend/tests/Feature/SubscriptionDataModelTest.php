<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\SubscriptionStatus;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\SubscriptionPlan;
use App\Services\Subscriptions\CompanySubscriptionProvisioningService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

final class SubscriptionDataModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_rejects_second_active_subscription_for_same_company(): void
    {
        $company = Company::factory()->create();
        CompanySubscription::factory()->create(['company_id' => $company->id]);

        $this->expectException(QueryException::class);
        CompanySubscription::factory()->create(['company_id' => $company->id]);
    }

    public function test_provisioning_service_rejects_duplicate_active(): void
    {
        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create();
        $svc = app(CompanySubscriptionProvisioningService::class);
        $svc->createSubscription($company, $plan, SubscriptionStatus::Active);

        $this->expectException(ValidationException::class);
        $svc->createSubscription($company, $plan, SubscriptionStatus::Active);
    }

    public function test_provisioning_rejects_inactive_plan_without_override(): void
    {
        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->inactive()->create();
        $svc = app(CompanySubscriptionProvisioningService::class);

        $this->expectException(ValidationException::class);
        $svc->createSubscription($company, $plan, SubscriptionStatus::Draft);
    }

    public function test_provisioning_allows_inactive_plan_when_explicitly_overridden(): void
    {
        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->inactive()->create();
        $svc = app(CompanySubscriptionProvisioningService::class);
        $sub = $svc->createSubscription($company, $plan, SubscriptionStatus::Draft, allowInactivePlan: true);

        self::assertTrue($plan->is($sub->plan));
    }

    public function test_company_keeps_subscription_history_after_cancel_and_new_active(): void
    {
        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create();
        $svc = app(CompanySubscriptionProvisioningService::class);
        $first = $svc->createSubscription($company, $plan, SubscriptionStatus::Active);
        $first->update([
            'status' => SubscriptionStatus::Cancelled,
            'cancelled_at' => now(),
        ]);

        $second = $svc->createSubscription($company, $plan, SubscriptionStatus::Active);

        self::assertCount(2, $company->subscriptions()->get());
        $company->refresh();
        self::assertNotNull($company->subscription);
        self::assertSame((string) $second->id, (string) $company->subscription->id);
    }
}
