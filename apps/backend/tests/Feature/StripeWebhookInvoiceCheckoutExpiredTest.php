<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\StripeCheckoutAttemptStatus;
use App\Models\Company;
use App\Models\InAppNotification;
use App\Models\Invoice;
use App\Models\NotificationDelivery;
use App\Models\StripeCheckoutAttempt;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

final class StripeWebhookInvoiceCheckoutExpiredTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_session_expired_marks_invoice_attempt_expired_for_payment_mode(): void
    {
        $secret = 'whsec_expired_test';
        Config::set('stripe.webhook_secret', $secret);

        $company = Company::factory()->create(['billing_email' => 'pay@example.com']);
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()->create([
            'company_id' => $company->id,
            'order_id' => null,
            'invoice_number' => 'INV-EXP-1',
            'invoice_status' => InvoiceStatus::Sent,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(7)->toDateString(),
            'subtotal_pence' => 2_000,
            'tax_pence' => 0,
            'total_pence' => 2_000,
            'currency' => 'GBP',
            'stripe_checkout_session_id' => 'cs_test_expired_1',
        ]);

        StripeCheckoutAttempt::query()->create([
            'invoice_id' => $invoice->id,
            'order_id' => $invoice->order_id,
            'company_id' => $invoice->company_id,
            'stripe_checkout_session_id' => 'cs_test_expired_1',
            'status' => StripeCheckoutAttemptStatus::Pending,
            'amount_pence' => 2_000,
            'currency' => 'GBP',
            'customer_email' => 'pay@example.com',
            'marketing_opt_in' => null,
            'expires_at' => null,
        ]);

        $payload = json_encode([
            'id' => 'evt_cs_expired_1',
            'type' => 'checkout.session.expired',
            'data' => [
                'object' => [
                    'id' => 'cs_test_expired_1',
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

        $attempt = StripeCheckoutAttempt::query()->where('stripe_checkout_session_id', 'cs_test_expired_1')->firstOrFail();
        self::assertSame(StripeCheckoutAttemptStatus::Expired, $attempt->status);
        self::assertNotNull($attempt->expired_at);
        self::assertNull($attempt->sales_follow_up_dispatched_at);
        self::assertSame(0, InAppNotification::query()->where('kind', 'staff.invoice.checkout_abandoned')->count());
        self::assertSame(0, NotificationDelivery::query()->where('type', 'invoice.checkout.abandoned_reminder')->count());
    }

    public function test_checkout_session_expired_ignores_subscription_mode(): void
    {
        $secret = 'whsec_expired_test_2';
        Config::set('stripe.webhook_secret', $secret);

        $payload = json_encode([
            'id' => 'evt_cs_expired_sub_1',
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
        ], $payload)->assertOk();

        self::assertSame(0, (int) StripeCheckoutAttempt::query()->count());
    }

    public function test_checkout_session_expired_with_false_marketing_opt_in_does_not_dispatch_follow_up(): void
    {
        $secret = 'whsec_expired_no_follow';
        Config::set('stripe.webhook_secret', $secret);
        Config::set('notifications.enabled', false);
        $this->seed(WeSharpDemoSeeder::class);

        $company = Company::factory()->create(['billing_email' => 'pay@example.com']);
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()->create([
            'company_id' => $company->id,
            'order_id' => null,
            'invoice_number' => 'INV-EXP-0',
            'invoice_status' => InvoiceStatus::Sent,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(7)->toDateString(),
            'subtotal_pence' => 2_000,
            'tax_pence' => 0,
            'total_pence' => 2_000,
            'currency' => 'GBP',
            'stripe_checkout_session_id' => 'cs_test_expired_no_follow',
        ]);

        StripeCheckoutAttempt::query()->create([
            'invoice_id' => $invoice->id,
            'order_id' => $invoice->order_id,
            'company_id' => $invoice->company_id,
            'stripe_checkout_session_id' => 'cs_test_expired_no_follow',
            'status' => StripeCheckoutAttemptStatus::Pending,
            'amount_pence' => 2_000,
            'currency' => 'GBP',
            'customer_email' => 'pay@example.com',
            'marketing_opt_in' => false,
            'expires_at' => null,
        ]);

        $payload = json_encode([
            'id' => 'evt_cs_expired_nofollow',
            'type' => 'checkout.session.expired',
            'data' => [
                'object' => [
                    'id' => 'cs_test_expired_no_follow',
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

        $attempt = StripeCheckoutAttempt::query()->where('stripe_checkout_session_id', 'cs_test_expired_no_follow')->firstOrFail();
        self::assertSame(StripeCheckoutAttemptStatus::Expired, $attempt->status);
        self::assertNull($attempt->sales_follow_up_dispatched_at);
        self::assertSame(0, InAppNotification::query()->where('kind', 'staff.invoice.checkout_abandoned')->count());
        self::assertSame(0, NotificationDelivery::query()->where('type', 'invoice.checkout.abandoned_reminder')->count());
    }

    public function test_checkout_session_expired_with_marketing_opt_in_dispatches_follow_up_once(): void
    {
        $secret = 'whsec_expired_follow';
        Config::set('stripe.webhook_secret', $secret);
        Config::set('notifications.enabled', false);
        $this->seed(WeSharpDemoSeeder::class);

        $company = Company::factory()->create(['billing_email' => 'pay@example.com']);
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()->create([
            'company_id' => $company->id,
            'order_id' => null,
            'invoice_number' => 'INV-EXP-FOLLOW',
            'invoice_status' => InvoiceStatus::Sent,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(7)->toDateString(),
            'subtotal_pence' => 2_000,
            'tax_pence' => 0,
            'total_pence' => 2_000,
            'currency' => 'GBP',
            'stripe_checkout_session_id' => 'cs_test_expired_follow',
        ]);

        StripeCheckoutAttempt::query()->create([
            'invoice_id' => $invoice->id,
            'order_id' => $invoice->order_id,
            'company_id' => $invoice->company_id,
            'stripe_checkout_session_id' => 'cs_test_expired_follow',
            'status' => StripeCheckoutAttemptStatus::Pending,
            'amount_pence' => 2_000,
            'currency' => 'GBP',
            'customer_email' => 'pay@example.com',
            'marketing_opt_in' => true,
            'expires_at' => null,
        ]);

        $payload = json_encode([
            'id' => 'evt_cs_expired_follow',
            'type' => 'checkout.session.expired',
            'data' => [
                'object' => [
                    'id' => 'cs_test_expired_follow',
                    'mode' => 'payment',
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

        $attempt = StripeCheckoutAttempt::query()->where('stripe_checkout_session_id', 'cs_test_expired_follow')->firstOrFail();
        self::assertSame(StripeCheckoutAttemptStatus::Expired, $attempt->status);
        self::assertNotNull($attempt->sales_follow_up_dispatched_at);
        self::assertSame(2, InAppNotification::query()->where('kind', 'staff.invoice.checkout_abandoned')->count());
        self::assertSame(1, NotificationDelivery::query()->where('type', 'invoice.checkout.abandoned_reminder')->count());

        $t2 = time() + 5;
        $signed2 = $t2.'.'.$payload;
        $v2 = hash_hmac('sha256', $signed2, $secret);
        $headers2 = [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => 't='.$t2.',v1='.$v2,
        ];

        $this->call('POST', '/api/webhooks/stripe', [], [], [], $headers2, $payload)->assertOk();

        self::assertSame(2, InAppNotification::query()->where('kind', 'staff.invoice.checkout_abandoned')->count());
        self::assertSame(1, NotificationDelivery::query()->where('type', 'invoice.checkout.abandoned_reminder')->count());
    }
}
