<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
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
}
