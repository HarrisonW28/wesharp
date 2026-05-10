<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

final class AdminStripeCheckoutPlaceholderApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_placeholder_returns_metadata_without_checkout_url(): void
    {
        Config::set('stripe.hosted_checkout_enabled', false);

        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();
        $invoice = Invoice::query()->firstOrFail();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson("/api/admin/invoices/{$invoice->id}/stripe-checkout-session");

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.hosted_checkout_available', false)
            ->assertJsonPath('data.checkout_url', null);
    }

    public function test_when_hosted_checkout_enabled_without_redirect_urls_returns_disabled_reason(): void
    {
        Config::set('stripe.secret', 'sk_test_'.str_repeat('a', 24));
        Config::set('stripe.webhook_secret', 'whsec_test_placeholder');
        Config::set('stripe.hosted_checkout_enabled', true);
        Config::set('stripe.checkout_success_url', '');
        Config::set('stripe.checkout_cancel_url', '');

        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()->where('invoice_status', InvoiceStatus::Sent->value)->firstOrFail();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson("/api/admin/invoices/{$invoice->id}/stripe-checkout-session");

        $res->assertOk()
            ->assertJsonPath('data.hosted_checkout_available', false)
            ->assertJsonPath('data.checkout_url', null);

        $reason = (string) $res->json('data.disabled_reason');
        self::assertStringContainsString('STRIPE_CHECKOUT_SUCCESS_URL', $reason);
    }

    public function test_route_manager_cannot_request_stripe_checkout_placeholder(): void
    {
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()->where('invoice_status', InvoiceStatus::Sent->value)->firstOrFail();
        $driver = User::query()->where('email', 'driver@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $driver->id)
            ->postJson("/api/admin/invoices/{$invoice->id}/stripe-checkout-session")
            ->assertForbidden();
    }
}
