<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Models\Company;
use App\Models\Invoice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class StripeWebhookInvoiceSettlementTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_session_completed_settles_invoice_idempotently(): void
    {
        $secret = 'whsec_settle_test';
        Config::set('stripe.webhook_secret', $secret);

        $company = Company::factory()->create();
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()->create([
            'company_id' => $company->id,
            'order_id' => null,
            'invoice_number' => 'INV-WH-1',
            'invoice_status' => InvoiceStatus::Sent,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(7)->toDateString(),
            'subtotal_pence' => 5_000,
            'tax_pence' => 0,
            'total_pence' => 5_000,
            'currency' => 'GBP',
        ]);

        $payload = json_encode([
            'id' => 'evt_cs_complete_1',
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id' => 'cs_test_1',
                    'payment_status' => 'paid',
                    'amount_total' => 5_000,
                    'payment_intent' => 'pi_test_settle_1',
                    'metadata' => [
                        'invoice_id' => (string) $invoice->id,
                        'company_id' => (string) $company->id,
                        'order_id' => '',
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

        $invoice->refresh();
        self::assertSame(InvoiceStatus::Paid, $invoice->invoice_status);

        $p = DB::table('payments')->where('stripe_payment_intent_id', 'pi_test_settle_1')->first();
        self::assertNotNull($p);
        self::assertSame(5_000, (int) $p->amount_pence);

        $this->call('POST', '/api/webhooks/stripe', [], [], [], $headers, $payload)->assertOk()->assertJson(['received' => true]);

        self::assertSame(1, (int) DB::table('payments')->where('stripe_payment_intent_id', 'pi_test_settle_1')->count());
    }
}
