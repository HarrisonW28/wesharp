<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class RecurringRevenueReportingApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_includes_recurring_block_with_split_when_tagged_invoices_exist(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);
        $company = Company::factory()->create();
        CompanySubscription::factory()->create([
            'company_id' => $company->id,
            'status' => SubscriptionStatus::Active,
            'renews_at' => '2026-06-15',
        ]);
        $booking = Booking::factory()->create(['company_id' => $company->id]);
        $order = Order::factory()->create(['company_id' => $company->id, 'booking_id' => $booking->id]);

        Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $order->id,
            'invoice_status' => InvoiceStatus::Sent,
            'issued_on' => '2026-06-10',
            'total_pence' => 12_000,
            'is_subscription_billing' => true,
        ]);
        Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $order->id,
            'invoice_status' => InvoiceStatus::Sent,
            'issued_on' => '2026-06-11',
            'total_pence' => 5000,
            'is_subscription_billing' => false,
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/finance/dashboard?date_from=2026-06-01&date_to=2026-06-30');

        $res->assertOk();
        self::assertTrue((bool) $res->json('data.recurring_revenue.reporting_surface_ready'));
        self::assertSame(12_000, (int) $res->json('data.recurring_revenue.revenue_invoiced_period_pence.subscription_tagged'));
        self::assertSame(5000, (int) $res->json('data.recurring_revenue.revenue_invoiced_period_pence.one_off'));
        self::assertTrue((bool) $res->json('data.recurring_revenue.mrr.computable'));
        $snapshot = (int) CompanySubscription::query()->where('company_id', $company->id)->value('price_amount_minor_snapshot');
        self::assertSame($snapshot, (int) $res->json('data.recurring_revenue.mrr.value_pence'));
        self::assertGreaterThanOrEqual(1, count($res->json('data.recurring_revenue.upcoming_renewals') ?? []));
    }
}
