<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Actions\Invoices\AllocateInvoiceNumber;
use App\Actions\Invoices\GenerateSubscriptionInvoiceAction;
use App\Enums\InvoiceSourceType;
use App\Enums\InvoiceStatus;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Enums\UserRole;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\User;
use App\Services\Invoices\SubscriptionInvoiceIdempotency;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

final class RecurringInvoiceFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_second_invoice_for_same_order_is_rejected(): void
    {
        $finance = User::factory()->create(['role' => UserRole::Finance]);
        $order = Order::factory()->create();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/invoices', ['order_id' => $order->id])
            ->assertCreated();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson('/api/admin/invoices', ['order_id' => $order->id])
            ->assertStatus(422);
    }

    public function test_duplicate_subscription_billing_period_rejected_at_database(): void
    {
        $company = Company::factory()->create();
        $sub = CompanySubscription::factory()->create(['company_id' => $company->id]);

        $base = [
            'company_id' => $company->id,
            'order_id' => null,
            'invoice_number' => AllocateInvoiceNumber::generate(),
            'invoice_status' => InvoiceStatus::Draft->value,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(14)->toDateString(),
            'subtotal_pence' => 1000,
            'tax_pence' => 200,
            'total_pence' => 1200,
            'currency' => 'GBP',
            'source_type' => InvoiceSourceType::CompanySubscription->value,
            'source_id' => (string) $sub->id,
            'billing_period_start' => '2026-04-01',
            'billing_period_end' => '2026-04-30',
        ];

        Invoice::query()->create($base);

        $this->expectException(QueryException::class);
        $base['invoice_number'] = AllocateInvoiceNumber::generate();
        Invoice::query()->create($base);
    }

    public function test_void_subscription_invoice_allows_same_period_row_for_data_recovery(): void
    {
        $company = Company::factory()->create();
        $sub = CompanySubscription::factory()->create(['company_id' => $company->id]);

        $base = [
            'company_id' => $company->id,
            'order_id' => null,
            'invoice_number' => AllocateInvoiceNumber::generate(),
            'invoice_status' => InvoiceStatus::Void->value,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(14)->toDateString(),
            'subtotal_pence' => 1000,
            'tax_pence' => 200,
            'total_pence' => 1200,
            'currency' => 'GBP',
            'source_type' => InvoiceSourceType::CompanySubscription->value,
            'source_id' => (string) $sub->id,
            'billing_period_start' => '2026-05-01',
            'billing_period_end' => '2026-05-31',
        ];

        Invoice::query()->create($base);
        $base['invoice_number'] = AllocateInvoiceNumber::generate();
        $base['invoice_status'] = InvoiceStatus::Draft->value;
        Invoice::query()->create($base);

        self::assertSame(2, (int) Invoice::query()->where('source_id', $sub->id)->count());
    }

    public function test_generate_subscription_invoice_action_is_disabled_by_default(): void
    {
        Config::set('invoices.subscription_invoice_generation_enabled', false);
        $sub = CompanySubscription::factory()->create();

        $action = new GenerateSubscriptionInvoiceAction;

        try {
            $action->execute($sub, now()->startOfMonth(), now()->endOfMonth());
            self::fail('Expected HttpException');
        } catch (HttpException $e) {
            self::assertSame(501, $e->getStatusCode());
        }
    }

    public function test_subscription_idempotency_guard_blocks_before_not_implemented_when_enabled(): void
    {
        Config::set('invoices.subscription_invoice_generation_enabled', true);
        $company = Company::factory()->create();
        $sub = CompanySubscription::factory()->create(['company_id' => $company->id]);

        Invoice::query()->create([
            'company_id' => $company->id,
            'order_id' => null,
            'invoice_number' => AllocateInvoiceNumber::generate(),
            'invoice_status' => InvoiceStatus::Draft->value,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(14)->toDateString(),
            'subtotal_pence' => 500,
            'tax_pence' => 100,
            'total_pence' => 600,
            'currency' => 'GBP',
            'source_type' => InvoiceSourceType::CompanySubscription->value,
            'source_id' => (string) $sub->id,
            'billing_period_start' => '2026-06-01',
            'billing_period_end' => '2026-06-30',
        ]);

        $action = new GenerateSubscriptionInvoiceAction;

        try {
            $action->execute($sub, now()->parse('2026-06-01'), now()->parse('2026-06-30'));
            self::fail('Expected HttpException');
        } catch (HttpException $e) {
            self::assertSame(422, $e->getStatusCode());
        }
    }

    public function test_subscription_idempotency_service_detects_blocking_invoice(): void
    {
        $company = Company::factory()->create();
        $sub = CompanySubscription::factory()->create(['company_id' => $company->id]);

        self::assertFalse(SubscriptionInvoiceIdempotency::blockingInvoiceExists((string) $sub->id, '2026-07-01', '2026-07-31'));

        Invoice::query()->create([
            'company_id' => $company->id,
            'order_id' => null,
            'invoice_number' => AllocateInvoiceNumber::generate(),
            'invoice_status' => InvoiceStatus::Sent->value,
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(14)->toDateString(),
            'subtotal_pence' => 500,
            'tax_pence' => 100,
            'total_pence' => 600,
            'currency' => 'GBP',
            'source_type' => InvoiceSourceType::CompanySubscription->value,
            'source_id' => (string) $sub->id,
            'billing_period_start' => '2026-07-01',
            'billing_period_end' => '2026-07-31',
        ]);

        self::assertTrue(SubscriptionInvoiceIdempotency::blockingInvoiceExists((string) $sub->id, '2026-07-01', '2026-07-31'));
    }
}
