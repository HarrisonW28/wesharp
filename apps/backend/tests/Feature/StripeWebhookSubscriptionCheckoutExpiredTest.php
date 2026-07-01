<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\StripeCheckoutAttemptStatus;
use App\Models\Company;
use App\Models\NotificationDelivery;
use App\Models\StripeSubscriptionCheckoutAttempt;
use App\Models\SubscriptionPlan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

final class StripeWebhookSubscriptionCheckoutExpiredTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_session_expired_marks_subscription_attempt_expired_and_emails_customer(): void
    {
        $secret = 'whsec_sub_expired';
        Config::set('stripe.webhook_secret', $secret);
        Config::set('notifications.enabled', false);

        $company = Company::factory()->create(['name' => 'Solo Prep']);
        $plan = SubscriptionPlan::factory()->create([
            'name' => 'Home Cook Care',
            'stripe_price_id' => 'price_sub_exp',
            'is_active' => true,
            'show_on_public_site' => true,
        ]);

        StripeSubscriptionCheckoutAttempt::query()->create([
            'company_id' => $company->id,
            'subscription_plan_id' => $plan->id,
            'stripe_checkout_session_id' => 'cs_sub_expired_1',
            'status' => StripeCheckoutAttemptStatus::Pending,
            'amount_pence' => 9900,
            'currency' => 'GBP',
            'customer_email' => 'solo@example.com',
            'expires_at' => null,
        ]);

        $payload = json_encode([
            'id' => 'evt_cs_sub_expired_1',
            'type' => 'checkout.session.expired',
            'data' => [
                'object' => [
                    'id' => 'cs_sub_expired_1',
                    'mode' => 'subscription',
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $t = time();
        $signed = $t.'.'.$payload;
        $v1 = hash_hmac('sha256', $signed, $secret);

        $this->call('POST', '/api/webhooks/stripe', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => 't='.$t.',v1='.$v1,
        ], $payload)->assertOk()->assertJson(['received' => true]);

        $attempt = StripeSubscriptionCheckoutAttempt::query()
            ->where('stripe_checkout_session_id', 'cs_sub_expired_1')
            ->firstOrFail();

        self::assertSame(StripeCheckoutAttemptStatus::Expired, $attempt->status);
        self::assertNotNull($attempt->expired_at);
        self::assertNotNull($attempt->follow_up_dispatched_at);
        self::assertSame(
            1,
            NotificationDelivery::query()->where('type', 'subscription.checkout.abandoned_reminder')->count(),
        );
    }
}
