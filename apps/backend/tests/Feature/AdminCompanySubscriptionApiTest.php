<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\SubscriptionStatus;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\Contact;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminCompanySubscriptionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_can_assign_change_cancel_and_reactivate_with_audits(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);
        $company = Company::factory()->create();
        $planA = SubscriptionPlan::factory()->create(['name' => 'Plan A', 'is_active' => true]);
        $planB = SubscriptionPlan::factory()->create(['name' => 'Plan B', 'is_active' => true]);
        $contact = Contact::factory()->create(['company_id' => $company->id, 'archived_at' => null]);

        $assign = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->postJson(
            '/api/admin/companies/'.$company->id.'/subscriptions',
            [
                'subscription_plan_id' => $planA->id,
                'starts_at' => '2026-01-01',
                'renews_at' => '2026-02-01',
                'billing_contact_id' => $contact->id,
                'notes' => 'Initial',
            ],
        );
        $assign->assertCreated()
            ->assertJsonPath('success', true);
        $subId = (string) $assign->json('data.subscription.id');

        self::assertTrue(AuditLog::query()->where('action', 'company_subscription.assigned')->exists());

        $change = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->postJson(
            '/api/admin/companies/'.$company->id.'/subscriptions/change-plan',
            [
                'subscription_plan_id' => $planB->id,
                'effective_starts_at' => '2026-02-01',
                'renews_at' => '2026-03-01',
            ],
        );
        $change->assertOk();
        self::assertTrue(AuditLog::query()->where('action', 'company_subscription.plan_changed')->exists());
        self::assertSame(2, CompanySubscription::query()->where('company_id', $company->id)->count());

        $cancel = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->postJson(
            '/api/admin/companies/'.$company->id.'/subscriptions/cancel',
            ['cancellation_notes' => 'Customer request'],
        );
        $cancel->assertOk();
        self::assertTrue(AuditLog::query()->where('action', 'company_subscription.cancelled')->where('auditable_id', '!=', $subId)->exists());

        $react = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->postJson(
            '/api/admin/companies/'.$company->id.'/subscriptions/reactivate',
            [
                'starts_at' => '2026-04-01',
                'renews_at' => '2026-05-01',
                'subscription_plan_id' => $planB->id,
            ],
        );
        $react->assertCreated();
        self::assertTrue(AuditLog::query()->where('action', 'company_subscription.reactivated')->exists());
    }

    public function test_assign_rejects_when_active_exists(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);
        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create();
        CompanySubscription::factory()->create(['company_id' => $company->id, 'status' => SubscriptionStatus::Active]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->postJson(
            '/api/admin/companies/'.$company->id.'/subscriptions',
            [
                'subscription_plan_id' => $plan->id,
                'starts_at' => '2026-01-01',
            ],
        )->assertStatus(422);
    }

    public function test_assign_rejects_inactive_plan_without_override(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);
        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->inactive()->create();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->postJson(
            '/api/admin/companies/'.$company->id.'/subscriptions',
            [
                'subscription_plan_id' => $plan->id,
                'starts_at' => '2026-01-01',
                'allow_inactive_plan' => false,
            ],
        )->assertStatus(422);
    }

    public function test_route_manager_cannot_assign(): void
    {
        $user = User::factory()->create(['role' => UserRole::RouteManager]);
        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->postJson(
            '/api/admin/companies/'.$company->id.'/subscriptions',
            [
                'subscription_plan_id' => $plan->id,
                'starts_at' => '2026-01-01',
            ],
        )->assertForbidden();
    }

    public function test_route_manager_cannot_list_subscription_history(): void
    {
        $user = User::factory()->create(['role' => UserRole::RouteManager]);
        $company = Company::factory()->create();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/companies/'.$company->id.'/subscriptions')
            ->assertForbidden();
    }

    public function test_billing_contact_patch_writes_audit(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);
        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create();
        $c1 = Contact::factory()->create(['company_id' => $company->id, 'archived_at' => null]);
        $c2 = Contact::factory()->create(['company_id' => $company->id, 'archived_at' => null]);
        $sub = CompanySubscription::factory()->create([
            'company_id' => $company->id,
            'subscription_plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'billing_contact_id' => $c1->id,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->patchJson(
            '/api/admin/companies/'.$company->id.'/subscriptions/'.$sub->id,
            ['billing_contact_id' => $c2->id],
        )->assertOk();

        self::assertTrue(AuditLog::query()->where('action', 'company_subscription.billing_contact_changed')->exists());
        $sub->refresh();
        self::assertSame((string) $c2->id, (string) $sub->billing_contact_id);
    }
}
