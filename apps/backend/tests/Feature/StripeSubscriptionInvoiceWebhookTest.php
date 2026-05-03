<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\SubscriptionStatus;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\SubscriptionPlan;
use App\Services\Stripe\StripeSubscriptionRetrieveClient;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Mockery;
use Mockery\MockInterface;
use Stripe\Subscription;
use Tests\TestCase;

final class StripeSubscriptionInvoiceWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_invoice_payment_failed_marks_subscription_past_due_and_sets_failure_timestamp(): void
    {
        $secret = 'whsec_inv_fail';
        Config::set('stripe.webhook_secret', $secret);

        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create();
        $sub = CompanySubscription::factory()->create([
            'company_id' => $company->id,
            'subscription_plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'stripe_subscription_id' => 'sub_inv_fail_1',
        ]);

        $payload = json_encode([
            'id' => 'evt_inv_fail_1',
            'type' => 'invoice.payment_failed',
            'data' => [
                'object' => [
                    'id' => 'in_test_1',
                    'subscription' => 'sub_inv_fail_1',
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $t = time();
        $headers = [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => 't='.$t.',v1='.hash_hmac('sha256', $t.'.'.$payload, $secret),
        ];

        $this->call('POST', '/api/webhooks/stripe', [], [], [], $headers, $payload)->assertOk();

        $sub->refresh();
        self::assertSame(SubscriptionStatus::PastDue, $sub->status);
        self::assertNotNull($sub->stripe_last_payment_failed_at);
    }

    public function test_invoice_paid_syncs_subscription_from_stripe_and_clears_failure(): void
    {
        $secret = 'whsec_inv_paid';
        Config::set('stripe.webhook_secret', $secret);

        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create();
        $sub = CompanySubscription::factory()->create([
            'company_id' => $company->id,
            'subscription_plan_id' => $plan->id,
            'status' => SubscriptionStatus::PastDue,
            'stripe_subscription_id' => 'sub_inv_paid_1',
            'stripe_last_payment_failed_at' => now()->subDay(),
        ]);

        $start = time() - 86400;
        $end = time() + 86400 * 28;
        $stripeSub = Subscription::constructFrom([
            'id' => 'sub_inv_paid_1',
            'object' => 'subscription',
            'status' => 'active',
            'current_period_start' => $start,
            'current_period_end' => $end,
        ]);

        $this->mock(StripeSubscriptionRetrieveClient::class, function (MockInterface $m) use ($stripeSub): void {
            $m->shouldReceive('retrieve')->once()->with('sub_inv_paid_1')->andReturn($stripeSub);
        });

        $payload = json_encode([
            'id' => 'evt_inv_paid_1',
            'type' => 'invoice.paid',
            'data' => [
                'object' => [
                    'id' => 'in_paid_1',
                    'subscription' => 'sub_inv_paid_1',
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $t = time();
        $headers = [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => 't='.$t.',v1='.hash_hmac('sha256', $t.'.'.$payload, $secret),
        ];

        $this->call('POST', '/api/webhooks/stripe', [], [], [], $headers, $payload)->assertOk();

        $sub->refresh();
        self::assertSame(SubscriptionStatus::Active, $sub->status);
        self::assertNull($sub->stripe_last_payment_failed_at);
        self::assertSame(Carbon::createFromTimestamp($end)->toDateString(), $sub->renews_at?->toDateString());
    }
}
