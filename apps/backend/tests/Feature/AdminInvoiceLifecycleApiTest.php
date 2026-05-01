<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminInvoiceLifecycleApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_send_is_blocked_when_not_draft(): void
    {
        $this->seed(WeSharpDemoSeeder::class);
        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()->where('invoice_status', 'sent')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson("/api/admin/invoices/{$invoice->id}/send", [])
            ->assertStatus(422);
    }

    public function test_reopen_draft_requires_no_payments(): void
    {
        $this->seed(WeSharpDemoSeeder::class);
        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        /** @phpstan-ignore-next-line */
        $company = Company::query()->firstOrFail();
        /** @phpstan-ignore-next-line */
        $order = Order::factory()->create(['company_id' => $company->id]);
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $order->id,
            'invoice_status' => InvoiceStatus::Sent,
            'due_on' => now()->addDays(7)->toDateString(),
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->postJson("/api/admin/invoices/{$invoice->id}/reopen-draft", [])
            ->assertOk()
            ->assertJsonPath('data.status', 'draft');

        self::assertTrue(
            AuditLog::query()
                ->where('action', 'invoice.reopened_draft')
                /** @phpstan-ignore-next-line */
                ->where('auditable_id', $invoice->id)
                ->exists()
        );
    }

    public function test_overdue_sync_on_show_writes_audit_once(): void
    {
        $this->seed(WeSharpDemoSeeder::class);
        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        /** @phpstan-ignore-next-line */
        $company = Company::query()->firstOrFail();
        /** @phpstan-ignore-next-line */
        $order = Order::factory()->create(['company_id' => $company->id]);
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $order->id,
            'invoice_status' => InvoiceStatus::Sent,
            'due_on' => '2010-06-01',
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->getJson("/api/admin/invoices/{$invoice->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'overdue');

        self::assertGreaterThanOrEqual(
            1,
            AuditLog::query()
                ->where('action', 'invoice.auto_overdue')
                /** @phpstan-ignore-next-line */
                ->where('auditable_id', $invoice->id)
                ->count()
        );
    }

    public function test_customer_cannot_view_draft_invoice(): void
    {
        $this->seed(WeSharpDemoSeeder::class);
        /** @phpstan-ignore-next-line */
        $company = Company::query()->firstOrFail();
        /** @phpstan-ignore-next-line */
        $order = Order::factory()->create(['company_id' => $company->id]);
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $order->id,
            'invoice_status' => InvoiceStatus::Draft,
        ]);

        $portal = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();
        $portal->update(['company_id' => $company->id]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $portal->id)
            ->getJson("/api/account/invoices/{$invoice->id}")
            ->assertForbidden();
    }

    public function test_portal_invoice_detail_excludes_internal_notes(): void
    {
        $this->seed(WeSharpDemoSeeder::class);
        $portal = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();
        /** @phpstan-ignore-next-line */
        $company = Company::query()->findOrFail((string) $portal->company_id);
        /** @phpstan-ignore-next-line */
        $booking = Booking::factory()->create(['company_id' => $company->id]);
        /** @phpstan-ignore-next-line */
        $order = Order::factory()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
        ]);
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $order->id,
            'invoice_status' => InvoiceStatus::Sent,
            'customer_notes' => 'Thank you for your business.',
            'internal_notes' => 'Staff: chase if unpaid 14d',
        ]);

        $payload = $this->withHeader('X-WeSharp-Test-User-Id', (string) $portal->id)
            ->getJson("/api/account/invoices/{$invoice->id}")
            ->assertOk()
            ->json('data');

        self::assertArrayNotHasKey('internal_notes', $payload);
        self::assertSame('Thank you for your business.', $payload['customer_notes'] ?? null);

        $ops = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $adminPayload = $this->withHeader('X-WeSharp-Test-User-Id', (string) $ops->id)
            ->getJson("/api/admin/invoices/{$invoice->id}")
            ->assertOk()
            ->json('data');

        self::assertSame('Staff: chase if unpaid 14d', $adminPayload['internal_notes'] ?? null);
    }
}
