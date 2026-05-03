<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Models\Company;
use App\Models\Invoice;
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
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
