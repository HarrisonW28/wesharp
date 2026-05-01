<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminInvoiceManualPaymentApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
    }

    public function test_finance_records_manual_payment_settling_remainder(): void
    {
        /** @phpstan-ignore-next-line */
        $candidate = Invoice::query()
            ->where('invoice_status', InvoiceStatus::Sent->value)
            ->get();

        /** @phpstan-ignore-next-line */
        $invoice = $candidate->first(function (Invoice $inv): bool {
            /** @phpstan-ignore-next-line */
            $received = (int) (Payment::query()->where('invoice_id', $inv->id)->sum('amount_pence'));
            /** @phpstan-ignore-next-line */
            $total = (int) $inv->total_pence;

            return ($total - $received) > 50;
        });

        self::assertNotNull($invoice);

        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();

        /** @phpstan-ignore-next-line */
        $received = (int) (Payment::query()->where('invoice_id', $invoice->id)->sum('amount_pence'));
        /** @phpstan-ignore-next-line */
        $total = (int) $invoice->total_pence;

        /** @phpstan-ignore-next-line */
        $remainder = max(1, $total - $received);

        $record = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/payments/manual', [
                'invoice_id' => $invoice->id,
                'amount_pence' => $remainder,
                'payment_method' => 'bank_transfer',
                'reference' => 'MVP PHPUnit manual settle',
                'paid_at' => now()->toIso8601String(),
            ]);

        $record->assertCreated()
            ->assertJsonPath('success', true);

        /** @phpstan-ignore-next-line */
        self::assertSame(InvoiceStatus::Paid, Invoice::query()->find($invoice->id)?->invoice_status);
    }

    public function test_partial_manual_payment_keeps_invoice_open(): void
    {
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()
            ->where('invoice_status', InvoiceStatus::Sent->value)
            ->get()
            ->first(function (Invoice $inv): bool {
                /** @phpstan-ignore-next-line */
                $received = (int) (Payment::query()->where('invoice_id', $inv->id)->sum('amount_pence'));
                /** @phpstan-ignore-next-line */
                $total = (int) $inv->total_pence;

                return ($total - $received) > 2_00;
            });

        self::assertNotNull($invoice);

        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/payments/manual', [
                'invoice_id' => $invoice->id,
                'amount_pence' => 50,
                'payment_method' => 'cash',
                'notes' => 'Part 1',
            ])
            ->assertCreated();

        /** @phpstan-ignore-next-line */
        $fresh = Invoice::query()->findOrFail($invoice->id);
        self::assertSame(InvoiceStatus::Sent, $fresh->invoice_status);
    }

    public function test_overpayment_blocked_for_finance_without_override(): void
    {
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()
            ->where('invoice_status', InvoiceStatus::Sent->value)
            ->get()
            ->first(function (Invoice $inv): bool {
                /** @phpstan-ignore-next-line */
                $received = (int) (Payment::query()->where('invoice_id', $inv->id)->sum('amount_pence'));
                /** @phpstan-ignore-next-line */
                $total = (int) $inv->total_pence;

                return ($total - $received) >= 100 && ($total - $received) < 50_000;
            });

        self::assertNotNull($invoice);

        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();
        /** @phpstan-ignore-next-line */
        $received = (int) (Payment::query()->where('invoice_id', $invoice->id)->sum('amount_pence'));
        /** @phpstan-ignore-next-line */
        $total = (int) $invoice->total_pence;
        $remaining = $total - $received;

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/payments/manual', [
                'invoice_id' => $invoice->id,
                'amount_pence' => $remaining + 50_000,
                'payment_method' => 'bank_transfer',
            ])
            ->assertStatus(422);
    }

    public function test_draft_invoice_manual_payment_rejected(): void
    {
        /** @phpstan-ignore-next-line */
        $company = Company::query()->firstOrFail();
        /** @phpstan-ignore-next-line */
        $booking = Booking::factory()->create(['company_id' => $company->id]);
        /** @phpstan-ignore-next-line */
        $order = Order::factory()->create(['company_id' => $company->id, 'booking_id' => $booking->id]);
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $order->id,
            'invoice_status' => InvoiceStatus::Draft,
        ]);

        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/payments/manual', [
                'invoice_id' => $invoice->id,
                'amount_pence' => 100,
                'payment_method' => 'cash',
            ])
            ->assertStatus(422);
    }

    public function test_void_invoice_manual_payment_rejected(): void
    {
        /** @phpstan-ignore-next-line */
        $company = Company::query()->firstOrFail();
        /** @phpstan-ignore-next-line */
        $booking = Booking::factory()->create(['company_id' => $company->id]);
        /** @phpstan-ignore-next-line */
        $order = Order::factory()->create(['company_id' => $company->id, 'booking_id' => $booking->id]);
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $order->id,
            'invoice_status' => InvoiceStatus::Void,
        ]);

        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/payments/manual', [
                'invoice_id' => $invoice->id,
                'amount_pence' => 100,
                'payment_method' => 'cash',
            ])
            ->assertStatus(422);
    }

    public function test_route_manager_cannot_record_manual_payment(): void
    {
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()->where('invoice_status', InvoiceStatus::Sent->value)->firstOrFail();
        $driver = User::query()->where('email', 'driver@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $driver->id)
            ->postJson('/api/admin/payments/manual', [
                'invoice_id' => $invoice->id,
                'amount_pence' => 100,
                'payment_method' => 'cash',
            ])
            ->assertForbidden();
    }

    public function test_stripe_method_rejected_on_manual_endpoint(): void
    {
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()->where('invoice_status', InvoiceStatus::Sent->value)->firstOrFail();
        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/payments/manual', [
                'invoice_id' => $invoice->id,
                'amount_pence' => 100,
                'payment_method' => 'stripe',
            ])
            ->assertStatus(422);
    }

    public function test_invoice_later_method_accepted(): void
    {
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()
            ->where('invoice_status', InvoiceStatus::Sent->value)
            ->get()
            ->first(function (Invoice $inv): bool {
                /** @phpstan-ignore-next-line */
                $received = (int) (Payment::query()->where('invoice_id', $inv->id)->sum('amount_pence'));
                /** @phpstan-ignore-next-line */
                $total = (int) $inv->total_pence;

                return ($total - $received) > 100;
            });

        self::assertNotNull($invoice);

        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/payments/manual', [
                'invoice_id' => $invoice->id,
                'amount_pence' => 100,
                'payment_method' => 'invoice_later',
            ])
            ->assertCreated()
            ->assertJsonPath('data.method', 'invoice_later');
    }

    public function test_manual_payment_stores_notes_and_recorded_by(): void
    {
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()
            ->where('invoice_status', InvoiceStatus::Sent->value)
            ->get()
            ->first(function (Invoice $inv): bool {
                /** @phpstan-ignore-next-line */
                $received = (int) (Payment::query()->where('invoice_id', $inv->id)->sum('amount_pence'));
                /** @phpstan-ignore-next-line */
                $total = (int) $inv->total_pence;

                return ($total - $received) > 100;
            });

        self::assertNotNull($invoice);

        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/payments/manual', [
                'invoice_id' => $invoice->id,
                'amount_pence' => 100,
                'payment_method' => 'cash',
                'notes' => 'Till drawer',
            ])
            ->assertCreated();

        self::assertSame('Till drawer', $res->json('data.notes'));
        self::assertSame((string) $finance->id, $res->json('data.recorded_by.id'));
    }

    public function test_patch_payment_meta_writes_audit(): void
    {
        /** @phpstan-ignore-next-line */
        $company = Company::query()->firstOrFail();
        /** @phpstan-ignore-next-line */
        $booking = Booking::factory()->create(['company_id' => $company->id]);
        /** @phpstan-ignore-next-line */
        $order = Order::factory()->create(['company_id' => $company->id, 'booking_id' => $booking->id]);
        /** @phpstan-ignore-next-line */
        $invoice = Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $order->id,
            'invoice_status' => InvoiceStatus::Sent,
        ]);
        /** @phpstan-ignore-next-line */
        $payment = Payment::factory()->create([
            'company_id' => $company->id,
            'invoice_id' => $invoice->id,
            'order_id' => $order->id,
            'amount_pence' => 500,
            'reference' => 'OLD',
            'notes' => null,
        ]);

        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->patchJson("/api/admin/payments/{$payment->id}", [
                'reference' => 'NEW-REF',
                'notes' => 'Adjusted by finance',
            ])
            ->assertOk()
            ->assertJsonPath('data.reference', 'NEW-REF')
            ->assertJsonPath('data.notes', 'Adjusted by finance');

        self::assertTrue(
            AuditLog::query()
                ->where('action', 'payment.adjusted')
                /** @phpstan-ignore-next-line */
                ->where('auditable_id', $payment->id)
                ->exists()
        );
    }
}
