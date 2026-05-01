<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\InvoiceLineItemType;
use App\Enums\InvoiceSourceType;
use App\Enums\InvoiceStatus;
use App\Enums\OrderStatus;
use App\Enums\ServiceType;
use App\Enums\SubscriptionStatus;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminSubscriptionInvoiceGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_can_generate_subscription_invoice_draft_and_safe_retry_returns_existing(): void
    {
        $finance = User::factory()->create(['role' => UserRole::Finance]);

        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create([
            'name' => 'Kitchen Care Monthly',
            'price_amount_minor' => 12_000,
            'currency' => 'GBP',
            'included_collections' => 1,
            'included_knife_allowance' => 2,
            'overage_price_amount_minor' => 800,
            'is_active' => true,
        ]);

        $sub = CompanySubscription::factory()->create([
            'company_id' => $company->id,
            'subscription_plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => '2026-06-01',
            'renews_at' => '2026-06-30',
            'price_amount_minor_snapshot' => 12_000,
            'currency' => 'GBP',
        ])->fresh(['plan']);

        $booking = Booking::factory()->create([
            'company_id' => $company->id,
            'service_type' => ServiceType::Collection,
        ]);

        $order = Order::factory()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
            'order_status' => OrderStatus::Completed,
            'completed_at' => now()->parse('2026-06-15 10:00:00'),
            'company_subscription_id' => $sub->id,
            'subscription_coverage' => [
                'mode' => 'subscription',
                'company_subscription_id' => (string) $sub->id,
                'subscription_plan_id' => (string) $plan->id,
                'plan_name' => $plan->name,
                'collection_units' => 1,
                'knife_units' => 4,
                'collections_included_for_order' => 1,
                'collections_overage_for_order' => 0,
                'knives_included_for_order' => 2,
                'knives_overage_for_order' => 2,
                'overage_unit_price_pence' => 800,
                'overage_total_pence' => 1600,
                'included_summary' => '1 collection included; 2 knife included; 2 knife overage',
            ],
        ]);
        self::assertNotNull($order->id);

        $path = '/api/admin/companies/'.$company->id.'/subscriptions/'.$sub->id.'/invoice-draft';

        $first = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson($path, [
                'billing_period_start' => '2026-06-01',
                'billing_period_end' => '2026-06-30',
            ]);

        $first->assertCreated()
            ->assertJsonPath('data.invoice.source_type', InvoiceSourceType::CompanySubscription->value)
            ->assertJsonPath('data.invoice.source_id', (string) $sub->id)
            ->assertJsonPath('data.invoice.billing_period_start', '2026-06-01')
            ->assertJsonPath('data.invoice.billing_period_end', '2026-06-30')
            ->assertJsonPath('data.invoice.is_subscription_billing', true);

        $invoiceId = (string) $first->json('data.invoice.id');
        self::assertNotSame('', $invoiceId);

        $inv = Invoice::query()->findOrFail($invoiceId);
        $inv->load('items');
        self::assertCount(2, $inv->items);
        self::assertSame(InvoiceStatus::Draft->value, $inv->invoice_status?->value);

        $types = $inv->items->pluck('line_item_type')->map(fn ($t) => $t?->value)->values()->all();
        self::assertContains(InvoiceLineItemType::Subscription->value, $types);
        self::assertContains(InvoiceLineItemType::Overage->value, $types);

        $second = $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->postJson($path, [
                'billing_period_start' => '2026-06-01',
                'billing_period_end' => '2026-06-30',
            ]);

        $second->assertOk()
            ->assertJsonPath('data.invoice.id', $invoiceId)
            ->assertJsonPath('data.already_existed', true);

        self::assertTrue(AuditLog::query()->where('action', 'invoice.subscription_draft_generated')->exists());
        self::assertTrue(AuditLog::query()->where('action', 'invoice.subscription_duplicate_prevented')->exists());
    }
}
