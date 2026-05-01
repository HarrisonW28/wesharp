<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminInvoiceVoidApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_void_requires_reason_and_succeeds_with_payload(): void
    {
        $this->seed(WeSharpDemoSeeder::class);

        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        /** @phpstan-ignore-next-line */
        $invoice = Invoice::query()->where('invoice_status', 'sent')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson("/api/admin/invoices/{$invoice->id}/void", [])
            ->assertUnprocessable();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson("/api/admin/invoices/{$invoice->id}/void", [
                'reason' => 'Voided during automated QA — duplicate issuance.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'void');
    }
}
