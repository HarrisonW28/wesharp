<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AccountSubscriptionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_includes_subscription_when_present(): void
    {
        $company = Company::factory()->create();
        User::factory()->create(['company_id' => $company->id]);

        $plan = SubscriptionPlan::factory()->create([
            'name' => 'Kitchen Care Plus',
            'description' => 'Collections and sharpening.',
        ]);
        CompanySubscription::factory()->create([
            'company_id' => $company->id,
            'subscription_plan_id' => $plan->id,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) User::query()->where('company_id', $company->id)->firstOrFail()->id)
            ->getJson('/api/account/dashboard')
            ->assertOk()
            ->assertJsonPath('data.dashboard.subscription.plan_name', 'Kitchen Care Plus')
            ->assertJsonPath('data.dashboard.subscription.status', 'active');
    }

    public function test_subscription_endpoint_returns_null_without_record(): void
    {
        $company = Company::factory()->create();
        $user = User::factory()->create(['company_id' => $company->id]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/account/subscription')
            ->assertOk()
            ->assertJsonPath('data.subscription', null);
    }
}
