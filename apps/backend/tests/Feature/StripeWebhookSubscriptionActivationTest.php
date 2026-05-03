<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\SubscriptionStatus;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\SubscriptionPlan;
use App\Services\Stripe\StripeSubscriptionRetrieveClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Mockery;
use Mockery\MockInterface;
use Stripe\Subscription;
use Tests\TestCase;

final class StripeWebhookSubscriptionActivationTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_checkout_session_completed_subscription_creates_active_company_subscription(): void
    {
        $secret = 'whsec_sub_test';
        Config::set('stripe.webhook_secret', $secret);

        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create([
            'stripe_price_id' => 'price_test_sub_1',
            'is_active' => true,
            'show_on_public_site' => true,
        ]);

        $start = time() - 3600;
        $end = time() + 86400 * 14;

        $stripeSub = Subscription::constructFrom([
            'id' => 'sub_wh_act_1',
            'object' => 'subscription',
            'current_period_start' => $start,
            'current_period_end' => $end,
        ]);

        $this->mock(StripeSubscriptionRetrieveClient::class, function (MockInterface $m) use ($stripeSub): void {
            $m->shouldReceive('retrieve')->once()->with('sub_wh_act_1')->andReturn($stripeSub);
        });

        $payload = json_encode([
            'id' => 'evt_cs_sub_complete_1',
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id' => 'cs_sub_test_1',
                    'mode' => 'subscription',
                    'payment_status' => 'paid',
                    'subscription' => 'sub_wh_act_1',
                    'customer' => 'cus_wh_1',
                    'metadata' => [
                        'company_id' => (string) $company->id,
                        'subscription_plan_id' => (string) $plan->id,
                    ],
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $t = time();
        $signed = $t.'.'.$payload;
        $v1 = hash_hmac('sha256', $signed, $secret);
        $headers = [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => 't='.$t.',v1='.$v1,
        ];

        $this->call('POST', '/api/webhooks/stripe', [], [], [], $headers, $payload)->assertOk()->assertJson(['received' => true]);

        $company->refresh();
        self::assertSame('cus_wh_1', $company->stripe_customer_id);

        $row = CompanySubscription::query()
            ->where('company_id', $company->id)
            ->where('stripe_subscription_id', 'sub_wh_act_1')
            ->first();
        self::assertNotNull($row);
        self::assertSame(SubscriptionStatus::Active, $row->status);
    }

    public function test_customer_subscription_updated_marks_local_cancelled(): void
    {
        $secret = 'whsec_sub_test_2';
        Config::set('stripe.webhook_secret', $secret);

        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create();
        $local = CompanySubscription::factory()->create([
            'company_id' => $company->id,
            'subscription_plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'stripe_subscription_id' => 'sub_cancel_me',
        ]);

        $payload = json_encode([
            'id' => 'evt_sub_upd_1',
            'type' => 'customer.subscription.updated',
            'data' => [
                'object' => [
                    'id' => 'sub_cancel_me',
                    'status' => 'canceled',
                    'current_period_end' => time() + 100,
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $t = time();
        $signed = $t.'.'.$payload;
        $v1 = hash_hmac('sha256', $signed, $secret);
        $headers = [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => 't='.$t.',v1='.$v1,
        ];

        $this->call('POST', '/api/webhooks/stripe', [], [], [], $headers, $payload)->assertOk();

        $local->refresh();
        self::assertSame(SubscriptionStatus::Cancelled, $local->status);
    }
}
