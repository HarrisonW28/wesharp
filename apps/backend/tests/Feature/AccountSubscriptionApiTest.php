<?php

namespace Tests\Feature;

use App\Enums\InvoiceSourceType;
use App\Enums\InvoiceStatus;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\Invoice;
use App\Models\Order;
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
            ->assertJsonPath('data.dashboard.subscription.status', 'active')
            ->assertJsonPath('data.dashboard.subscription.status_label', 'Active');
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

    public function test_subscription_payload_never_includes_internal_notes(): void
    {
        $company = Company::factory()->create(['billing_email' => 'billing@example.test']);
        $user = User::factory()->create(['company_id' => $company->id]);
        $plan = SubscriptionPlan::factory()->create([
            'name' => 'Pro',
            'description' => 'Plan description.',
            'included_collections' => null,
            'included_knife_allowance' => null,
        ]);
        $sub = CompanySubscription::factory()->create([
            'company_id' => $company->id,
            'subscription_plan_id' => $plan->id,
            'notes' => 'INTERNAL: comp credit — do not show customer',
        ]);

        $booking = Booking::factory()->create(['company_id' => $company->id]);
        $order = Order::factory()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
        ]);
        Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $order->id,
            'invoice_status' => InvoiceStatus::Draft,
            'is_subscription_billing' => true,
            'billing_period_start' => now()->startOfMonth()->toDateString(),
            'billing_period_end' => now()->endOfMonth()->toDateString(),
            'source_type' => InvoiceSourceType::CompanySubscription->value,
            'source_id' => $sub->id,
        ]);

        $json = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/account/subscription')
            ->assertOk()
            ->json();

        $encoded = json_encode($json);
        $this->assertIsString($encoded);
        $this->assertStringNotContainsString('INTERNAL:', $encoded);
        $this->assertStringNotContainsString('comp credit', $encoded);

        $row = $json['data']['subscription']['recent_invoices'][0];
        $this->assertArrayHasKey('billing_period_label', $row);
        $this->assertArrayHasKey('customer_status_label', $row);
        $this->assertNotNull($row['billing_period_label']);

        $this->assertSame('Plan description.', $json['data']['subscription']['summary']);
        $this->assertSame('billing@example.test', $json['data']['subscription']['billing_contact']['email']);
    }

    public function test_stripe_checkout_session_forbidden_without_company(): void
    {
        $user = User::factory()->create([
            'company_id' => null,
            'role' => \App\Enums\UserRole::CustomerOwner,
        ]);

        $plan = SubscriptionPlan::factory()->create([
            'stripe_price_id' => 'price_no_co',
            'is_active' => true,
            'show_on_public_site' => true,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->postJson('/api/account/subscription/stripe-checkout-session', [
                'subscription_plan_id' => $plan->id,
            ])
            ->assertForbidden();
    }
}
