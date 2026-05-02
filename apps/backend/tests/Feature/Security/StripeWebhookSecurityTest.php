<?php

namespace Tests\Feature\Security;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

final class StripeWebhookSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_rejects_when_webhook_secret_missing(): void
    {
        Config::set('stripe.webhook_secret', '');

        $response = $this->postJson('/api/webhooks/stripe', [], [
            'Stripe-Signature' => 't=1,v1=abc',
        ]);

        $response->assertStatus(503)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error.code', 'webhook_not_configured');
    }

    public function test_rejects_when_webhook_secret_missing_without_echoing_config_hints_when_not_debugging(): void
    {
        Config::set('stripe.webhook_secret', '');
        Config::set('app.debug', false);

        $response = $this->postJson('/api/webhooks/stripe', [], [
            'Stripe-Signature' => 't=1,v1=abc',
        ]);

        $response->assertStatus(503)
            ->assertJsonPath('error.code', 'webhook_not_configured');

        $message = $response->json('error.message');
        self::assertIsString($message);
        self::assertStringNotContainsStringIgnoringCase('secret', $message);
        self::assertStringNotContainsStringIgnoringCase('signing', $message);
    }

    public function test_accepts_valid_signature(): void
    {
        $secret = 'whsec_test_key_for_unit';
        Config::set('stripe.webhook_secret', $secret);

        $payload = '{"id":"evt_test"}';
        $t = time();
        $signed = $t.'.'.$payload;
        $v1 = hash_hmac('sha256', $signed, $secret);

        $response = $this->call(
            'POST',
            '/api/webhooks/stripe',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_STRIPE_SIGNATURE' => 't='.$t.',v1='.$v1,
            ],
            $payload
        );

        $response->assertOk()
            ->assertJson(['received' => true]);
    }
}
