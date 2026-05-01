<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class StripeWebhookIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_duplicate_event_id_is_idempotent(): void
    {
        $secret = 'whsec_test_idempotency';
        Config::set('stripe.webhook_secret', $secret);

        $payload = json_encode([
            'id' => 'evt_duplicate_test',
            'type' => 'payment_intent.succeeded',
        ], JSON_THROW_ON_ERROR);

        $t = time();
        $signed = $t.'.'.$payload;
        $v1 = hash_hmac('sha256', $signed, $secret);
        $headers = [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => 't='.$t.',v1='.$v1,
        ];

        $this->call('POST', '/api/webhooks/stripe', [], [], [], $headers, $payload)->assertOk()->assertJson(['received' => true]);
        $this->call('POST', '/api/webhooks/stripe', [], [], [], $headers, $payload)->assertOk()->assertJson(['received' => true]);

        self::assertSame(1, (int) DB::table('stripe_webhook_events')->where('id', 'evt_duplicate_test')->count());
    }
}
