<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\StripeCheckoutAttemptStatus;
use App\Enums\UserRole;
use App\Models\Company;
use App\Models\InAppNotification;
use App\Models\Invoice;
use App\Models\NotificationDelivery;
use App\Models\StripeCheckoutAttempt;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\Payments\StripeCheckoutSessionClient;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Mockery;
use Mockery\MockInterface;
use Stripe\Checkout\Session;
use Tests\TestCase;

/**
 * Sprint 19 regression: hosted invoice payments (admin/account), subscription checkout, checkout abandonment follow-up.
 *
 * Mirrors checklist in docs/roadmap/sprint-19.md §19.7–19.8 (payments, subscriptions, abandonment).
 */
final class Sprint19StripeRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_regression_account_invoice_checkout_persists_marketing_opt_in(): void
    {
        Config::set('stripe.secret', 'sk_test_'.str_repeat('a', 24));
        Config::set('stripe.webhook_secret', 'whsec_test_placeholder');
        Config::set('stripe.hosted_checkout_enabled', true);
        Config::set('stripe.checkout_success_url', 'https://app.test/paid?session_id={CHECKOUT_SESSION_ID}');
        Config::set('stripe.checkout_cancel_url', 'https://app.test/cancel');
        Config::set('stripe.allow_live', false);

        $stubSession = Session::constructFrom([
            'id' => 'cs_test_account_regr',
            'url' => 'https://checkout.stripe.test/pay/cs_test_account_regr',
            'expires_at' => time() + 3600,
        ]);

        $this->mock(StripeCheckoutSessionClient::class, function (MockInterface $m) use ($stubSession): void {
            $m->shouldReceive('createCheckoutSession')->once()->andReturn($stubSession);
        });

        $company = Company::factory()->create();
        $customer = User::factory()->create([
            'company_id' => $company->id,
            'role' => UserRole::CustomerOwner,
        ]);

        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()->create([
            'company_id' => $company->id,
            'order_id' => null,
            'invoice_number' => 'INV-REGR-ACCT',
            'invoice_status' => InvoiceStatus::Sent,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(7)->toDateString(),
            'subtotal_pence' => 3_000,
            'tax_pence' => 0,
            'total_pence' => 3_000,
            'currency' => 'GBP',
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $customer->id)
            ->postJson("/api/account/invoices/{$invoice->id}/stripe-checkout-session", [
                'marketing_opt_in' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.hosted_checkout_available', true)
            ->assertJsonPath('data.checkout_url', 'https://checkout.stripe.test/pay/cs_test_account_regr');

        $attempt = StripeCheckoutAttempt::query()->where('stripe_checkout_session_id', 'cs_test_account_regr')->firstOrFail();
        self::assertSame((string) $invoice->id, (string) $attempt->invoice_id);
        self::assertTrue($attempt->marketing_opt_in);
        self::assertSame(StripeCheckoutAttemptStatus::Pending, $attempt->status);
    }

    public function test_regression_account_subscription_checkout_returns_url_when_configured(): void
    {
        Config::set('stripe.secret', 'sk_test_'.str_repeat('b', 24));
        Config::set('stripe.webhook_secret', 'whsec_sub_regr');
        Config::set('stripe.hosted_checkout_enabled', true);
        Config::set('stripe.checkout_success_url', 'https://app.test/sub/paid?session_id={CHECKOUT_SESSION_ID}');
        Config::set('stripe.checkout_cancel_url', 'https://app.test/sub/cancel');
        Config::set('stripe.allow_live', false);

        $stubSession = Session::constructFrom([
            'id' => 'cs_test_sub_regr',
            'url' => 'https://checkout.stripe.test/pay/cs_test_sub_regr',
            'expires_at' => time() + 3600,
        ]);

        $this->mock(StripeCheckoutSessionClient::class, function (MockInterface $m) use ($stubSession): void {
            $m->shouldReceive('createCheckoutSession')->once()->andReturn($stubSession);
        });

        $company = Company::factory()->create();
        $customer = User::factory()->create([
            'company_id' => $company->id,
            'role' => UserRole::CustomerOwner,
        ]);

        $plan = SubscriptionPlan::factory()->create([
            'stripe_price_id' => 'price_regr_1',
            'is_active' => true,
            'show_on_public_site' => true,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $customer->id)
            ->postJson('/api/account/subscription/stripe-checkout-session', [
                'subscription_plan_id' => $plan->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.hosted_checkout_available', true)
            ->assertJsonPath('data.checkout_url', 'https://checkout.stripe.test/pay/cs_test_sub_regr');
    }

    /** Completed invoice attempts must not receive sales follow-up when a late checkout.session.expired arrives. */
    public function test_regression_expired_webhook_after_completion_does_not_dispatch_abandonment_follow_up(): void
    {
        $secret = 'whsec_regr_complete_then_expired';
        Config::set('stripe.webhook_secret', $secret);
        Config::set('notifications.enabled', false);
        $this->seed(WeSharpDemoSeeder::class);

        $company = Company::factory()->create(['billing_email' => 'payer@example.com']);
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()->create([
            'company_id' => $company->id,
            'order_id' => null,
            'invoice_number' => 'INV-REGR-COMP',
            'invoice_status' => InvoiceStatus::Paid,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(7)->toDateString(),
            'subtotal_pence' => 1_000,
            'tax_pence' => 0,
            'total_pence' => 1_000,
            'currency' => 'GBP',
            'stripe_checkout_session_id' => 'cs_test_regr_late_exp',
        ]);

        StripeCheckoutAttempt::query()->create([
            'invoice_id' => $invoice->id,
            'order_id' => $invoice->order_id,
            'company_id' => $invoice->company_id,
            'stripe_checkout_session_id' => 'cs_test_regr_late_exp',
            'status' => StripeCheckoutAttemptStatus::Completed,
            'amount_pence' => 1_000,
            'currency' => 'GBP',
            'customer_email' => 'payer@example.com',
            'marketing_opt_in' => true,
            'expires_at' => null,
            'completed_at' => now(),
        ]);

        $initialStaffFollowUps = InAppNotification::query()->where('kind', 'staff.invoice.checkout_abandoned')->count();
        $initialDeliveries = NotificationDelivery::query()->where('type', 'invoice.checkout.abandoned_reminder')->count();

        $payload = json_encode([
            'id' => 'evt_regr_late_expired',
            'type' => 'checkout.session.expired',
            'data' => [
                'object' => [
                    'id' => 'cs_test_regr_late_exp',
                    'mode' => 'payment',
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

        self::assertSame($initialStaffFollowUps, InAppNotification::query()->where('kind', 'staff.invoice.checkout_abandoned')->count());
        self::assertSame($initialDeliveries, NotificationDelivery::query()->where('type', 'invoice.checkout.abandoned_reminder')->count());

        $attempt = StripeCheckoutAttempt::query()->where('stripe_checkout_session_id', 'cs_test_regr_late_exp')->firstOrFail();
        self::assertSame(StripeCheckoutAttemptStatus::Completed, $attempt->status);
        self::assertNull($attempt->sales_follow_up_dispatched_at);
    }
}
