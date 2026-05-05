<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\StripeCheckoutAttemptStatus;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\StripeCheckoutAttempt;
use App\Models\User;
use App\Services\Payments\StripeCheckoutSessionClient;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Mockery;
use Mockery\MockInterface;
use Stripe\Checkout\Session;
use Tests\TestCase;

final class AdminStripeCheckoutSessionCreateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_admin_can_open_checkout_session_when_stripe_configured(): void
    {
        Config::set('stripe.secret', 'sk_test_'.str_repeat('a', 24));
        Config::set('stripe.webhook_secret', 'whsec_test_placeholder');
        Config::set('stripe.hosted_checkout_enabled', true);
        Config::set('stripe.checkout_success_url', 'https://app.test/paid?session_id={CHECKOUT_SESSION_ID}');
        Config::set('stripe.checkout_cancel_url', 'https://app.test/cancel');
        Config::set('stripe.allow_live', false);

        $stubSession = Session::constructFrom([
            'id' => 'cs_test_open',
            'url' => 'https://checkout.stripe.test/pay/cs_test_open',
            'expires_at' => time() + 3600,
        ]);

        $this->mock(StripeCheckoutSessionClient::class, function (MockInterface $m) use ($stubSession): void {
            $m->shouldReceive('createCheckoutSession')->once()->andReturn($stubSession);
        });

        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $company = Company::factory()->create();
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()->create([
            'company_id' => $company->id,
            'order_id' => null,
            'invoice_number' => 'INV-CHK-1',
            'invoice_status' => InvoiceStatus::Sent,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(7)->toDateString(),
            'subtotal_pence' => 4_000,
            'tax_pence' => 800,
            'total_pence' => 4_800,
            'currency' => 'GBP',
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson("/api/admin/invoices/{$invoice->id}/stripe-checkout-session")
            ->assertOk()
            ->assertJsonPath('data.hosted_checkout_available', true)
            ->assertJsonPath('data.checkout_url', 'https://checkout.stripe.test/pay/cs_test_open');

        $invoice->refresh();
        self::assertSame('cs_test_open', $invoice->stripe_checkout_session_id);

        $attempt = StripeCheckoutAttempt::query()->where('stripe_checkout_session_id', 'cs_test_open')->firstOrFail();
        self::assertSame((string) $invoice->id, (string) $attempt->invoice_id);
        self::assertSame(StripeCheckoutAttemptStatus::Pending, $attempt->status);
        self::assertSame(4_800, $attempt->amount_pence);
        self::assertFalse($attempt->marketing_opt_in);
    }

    public function test_admin_checkout_session_persists_marketing_opt_in_from_request(): void
    {
        Config::set('stripe.secret', 'sk_test_'.str_repeat('a', 24));
        Config::set('stripe.webhook_secret', 'whsec_test_placeholder');
        Config::set('stripe.hosted_checkout_enabled', true);
        Config::set('stripe.checkout_success_url', 'https://app.test/paid?session_id={CHECKOUT_SESSION_ID}');
        Config::set('stripe.checkout_cancel_url', 'https://app.test/cancel');
        Config::set('stripe.allow_live', false);

        $stubSession = Session::constructFrom([
            'id' => 'cs_test_optin',
            'url' => 'https://checkout.stripe.test/pay/cs_test_optin',
            'expires_at' => time() + 3600,
        ]);

        $this->mock(StripeCheckoutSessionClient::class, function (MockInterface $m) use ($stubSession): void {
            $m->shouldReceive('createCheckoutSession')->once()->andReturn($stubSession);
        });

        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $company = Company::factory()->create();
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()->create([
            'company_id' => $company->id,
            'order_id' => null,
            'invoice_number' => 'INV-CHK-OPT',
            'invoice_status' => InvoiceStatus::Sent,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(7)->toDateString(),
            'subtotal_pence' => 1_000,
            'tax_pence' => 0,
            'total_pence' => 1_000,
            'currency' => 'GBP',
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson("/api/admin/invoices/{$invoice->id}/stripe-checkout-session", ['marketing_opt_in' => true])
            ->assertOk();

        $attempt = StripeCheckoutAttempt::query()->where('stripe_checkout_session_id', 'cs_test_optin')->firstOrFail();
        self::assertTrue($attempt->marketing_opt_in);
    }

    public function test_admin_checkout_session_persists_marketing_opt_out_false_from_request(): void
    {
        Config::set('stripe.secret', 'sk_test_'.str_repeat('a', 24));
        Config::set('stripe.webhook_secret', 'whsec_test_placeholder');
        Config::set('stripe.hosted_checkout_enabled', true);
        Config::set('stripe.checkout_success_url', 'https://app.test/paid?session_id={CHECKOUT_SESSION_ID}');
        Config::set('stripe.checkout_cancel_url', 'https://app.test/cancel');
        Config::set('stripe.allow_live', false);

        $this->mock(StripeCheckoutSessionClient::class, function (MockInterface $m): void {
            $m->shouldReceive('createCheckoutSession')->once()->andReturn(Session::constructFrom([
                'id' => 'cs_test_optout',
                'url' => 'https://checkout.stripe.test/pay/cs_test_optout',
                'expires_at' => time() + 3600,
            ]));
        });

        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $company = Company::factory()->create();
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()->create([
            'company_id' => $company->id,
            'order_id' => null,
            'invoice_number' => 'INV-CHK-OPT2',
            'invoice_status' => InvoiceStatus::Sent,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(7)->toDateString(),
            'subtotal_pence' => 500,
            'tax_pence' => 0,
            'total_pence' => 500,
            'currency' => 'GBP',
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson("/api/admin/invoices/{$invoice->id}/stripe-checkout-session", ['marketing_opt_in' => false])
            ->assertOk();

        $attempt = StripeCheckoutAttempt::query()->where('stripe_checkout_session_id', 'cs_test_optout')->firstOrFail();
        self::assertFalse($attempt->marketing_opt_in);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
