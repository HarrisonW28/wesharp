<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Mail\GenericNotificationMailable;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\NotificationDelivery;
use App\Models\Order;
use App\Models\User;
use App\Services\Notifications\InvoiceEmailService;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

final class InvoiceEmailNotificationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);

        Config::set('notifications.enabled', true);
        Config::set('notifications.email.queue', false);
    }

    public function test_invoice_send_queues_customer_issued_email(): void
    {
        Mail::fake();

        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->firstOrFail();
        $company->forceFill(['billing_email' => 'billing@example.test'])->save();
        $order = Order::factory()->create(['company_id' => $company->id]);
        $invoice = Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $order->id,
            'invoice_status' => InvoiceStatus::Draft,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson("/api/admin/invoices/{$invoice->id}/send", [])
            ->assertOk()
            ->assertJsonPath('data.status', 'sent');

        Mail::assertSent(GenericNotificationMailable::class, 1);

        NotificationDelivery::query()
            ->where('source_type', Invoice::class)
            ->where('source_id', $invoice->id)
            ->where('type', 'invoice.issued')
            ->firstOrFail();
    }

    public function test_mark_paid_sends_payment_received_email_once(): void
    {
        Mail::fake();

        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->firstOrFail();
        $company->forceFill(['billing_email' => 'billing@example.test'])->save();
        $order = Order::factory()->create(['company_id' => $company->id]);
        $invoice = Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $order->id,
            'invoice_status' => InvoiceStatus::Sent,
            'total_pence' => 5000,
            'subtotal_pence' => 4000,
            'tax_pence' => 1000,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson("/api/admin/invoices/{$invoice->id}/mark-paid", [])
            ->assertOk();

        Mail::assertSent(GenericNotificationMailable::class, 1);

        NotificationDelivery::query()
            ->where('type', 'payment.received')
            ->where('source_type', Invoice::class)
            ->where('source_id', $invoice->id)
            ->firstOrFail();
    }

    public function test_invoice_issued_idempotent_without_resend_salt(): void
    {
        Mail::fake();

        $company = Company::query()->firstOrFail();
        $company->forceFill(['billing_email' => 'billing@example.test'])->save();
        $order = Order::factory()->create(['company_id' => $company->id]);
        $invoice = Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $order->id,
            'invoice_status' => InvoiceStatus::Sent,
        ]);

        $svc = app(InvoiceEmailService::class);
        $svc->sendInvoiceIssued($invoice);
        $svc->sendInvoiceIssued($invoice);

        Mail::assertSent(GenericNotificationMailable::class, 1);
    }
}
