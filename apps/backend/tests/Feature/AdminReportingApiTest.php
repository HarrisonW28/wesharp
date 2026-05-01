<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Enums\DamageReportStatus;
use App\Enums\KnifeServiceKind;
use App\Enums\KnifeStatus;
use App\Enums\OperationalRouteStatus;
use App\Enums\RouteStopStatus;
use App\Enums\ServiceType;
use App\Models\Booking;
use App\Models\Company;
use App\Models\DamageReport;
use App\Models\Invoice;
use App\Models\Knife;
use App\Models\KnifeServiceAssignment;
use App\Models\Order;
use App\Models\OperationalRoute;
use App\Models\RouteStop;
use App\Models\Payment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminReportingApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_can_access_sales_report_empty(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/reports/sales');

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.report', 'sales')
            ->assertJsonPath('data.kpis.total_revenue_pence', 0)
            ->assertJsonPath('data.kpis.paid_revenue_pence', 0)
            ->assertJsonPath('data.series.revenue_by_day', [])
            ->assertJsonPath('data.table.rows', []);
    }

    public function test_route_manager_cannot_access_sales_report(): void
    {
        $user = User::factory()->create(['role' => UserRole::RouteManager]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/reports/sales')
            ->assertForbidden();
    }

    public function test_route_manager_can_access_bookings_report_empty(): void
    {
        $user = User::factory()->create(['role' => UserRole::RouteManager]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/reports/bookings');

        $res->assertOk()
            ->assertJsonPath('data.report', 'bookings')
            ->assertJsonPath('data.kpis.bookings_created_count', 0)
            ->assertJsonPath('data.kpis.pending_bookings_pipeline_count', 0)
            ->assertJsonPath('data.series.bookings_by_day', [])
            ->assertJsonPath('data.series.booking_status_breakdown', [])
            ->assertJsonPath('data.table.rows', [])
            ->assertJsonPath('data.recent_activity.rows', []);
    }

    public function test_route_manager_can_access_orders_report_empty(): void
    {
        $user = User::factory()->create(['role' => UserRole::RouteManager]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/reports/orders');

        $res->assertOk()
            ->assertJsonPath('data.report', 'orders')
            ->assertJsonPath('data.kpis.orders_created_count', 0)
            ->assertJsonPath('data.series.orders_by_day', [])
            ->assertJsonPath('data.series.order_status_breakdown', [])
            ->assertJsonPath('data.table.rows', [])
            ->assertJsonPath('data.recent_activity.rows', []);
    }

    public function test_finance_cannot_access_operations_bookings_report(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/reports/bookings')
            ->assertForbidden();
    }

    public function test_finance_cannot_access_operations_orders_report(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/reports/orders')
            ->assertForbidden();
    }

    public function test_route_manager_can_access_routes_report_empty(): void
    {
        $user = User::factory()->create(['role' => UserRole::RouteManager]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/reports/routes');

        $res->assertOk()
            ->assertJsonPath('data.report', 'routes')
            ->assertJsonPath('data.kpis.routes_count', 0)
            ->assertJsonPath('data.kpis.total_stops', 0)
            ->assertJsonPath('data.series.routes_by_day', [])
            ->assertJsonPath('data.series.route_status_breakdown', [])
            ->assertJsonPath('data.series.stop_status_breakdown', [])
            ->assertJsonPath('data.series.failed_collection_reasons', [])
            ->assertJsonPath('data.table.rows', []);
    }

    public function test_finance_cannot_access_operations_routes_report(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/reports/routes')
            ->assertForbidden();
    }

    public function test_routes_report_includes_failed_reason_breakdown_and_completion_rate(): void
    {
        $user = User::factory()->create(['role' => UserRole::RouteManager]);
        $driver = User::factory()->create(['role' => UserRole::RouteManager]);

        $route = OperationalRoute::factory()->create([
            'scheduled_date' => '2026-03-10',
            'coverage_city' => 'London',
            'driver_user_id' => $driver->id,
            'route_status' => OperationalRouteStatus::Completed,
        ]);

        RouteStop::factory()->create([
            'route_id' => $route->id,
            'sequence' => 1,
            'route_stop_status' => RouteStopStatus::Completed,
        ]);
        RouteStop::factory()->create([
            'route_id' => $route->id,
            'sequence' => 2,
            'route_stop_status' => RouteStopStatus::Skipped,
            'failure_reason' => 'Premises closed',
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/reports/routes?date_from=2026-03-01&date_to=2026-03-31&area=London');

        $res->assertOk();
        self::assertSame(1, (int) $res->json('data.kpis.routes_count'));
        self::assertSame(2, (int) $res->json('data.kpis.total_stops'));
        self::assertSame(1, (int) $res->json('data.kpis.completed_stops'));
        self::assertSame(1, (int) $res->json('data.kpis.failed_collections'));
        self::assertSame(0.5, (float) $res->json('data.kpis.completion_rate'));

        $reasons = $res->json('data.series.failed_collection_reasons');
        self::assertIsArray($reasons);
        self::assertSame('Premises closed', $reasons[0]['reason'] ?? null);
        self::assertSame(1, (int) ($reasons[0]['count'] ?? 0));
    }

    public function test_sales_report_respects_date_and_company_filters(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);
        $company = Company::factory()->create();

        /** @phpstan-ignore-next-line */
        $b1 = Booking::factory()->create(['company_id' => $company->id]);
        /** @phpstan-ignore-next-line */
        $o1 = Order::factory()->create(['company_id' => $company->id, 'booking_id' => $b1->id]);
        Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $o1->id,
            'invoice_status' => InvoiceStatus::Sent,
            'issued_on' => '2026-03-15',
            'total_pence' => 10_000,
        ]);

        /** @phpstan-ignore-next-line */
        $b2 = Booking::factory()->create(['company_id' => $company->id]);
        /** @phpstan-ignore-next-line */
        $o2 = Order::factory()->create(['company_id' => $company->id, 'booking_id' => $b2->id]);
        Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $o2->id,
            'invoice_status' => InvoiceStatus::Sent,
            'issued_on' => '2020-01-01',
            'total_pence' => 5_000,
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/reports/sales?date_from=2026-03-01&date_to=2026-03-31&company_id='.$company->id);

        $res->assertOk();
        self::assertSame(10_000, (int) $res->json('data.kpis.total_revenue_pence'));
        self::assertSame(1, (int) $res->json('data.kpis.invoices_sent_count'));
    }

    public function test_sales_paid_revenue_sums_payments_in_period(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);
        $company = Company::factory()->create();
        /** @phpstan-ignore-next-line */
        $b = Booking::factory()->create(['company_id' => $company->id]);
        /** @phpstan-ignore-next-line */
        $o = Order::factory()->create(['company_id' => $company->id, 'booking_id' => $b->id]);
        /** @phpstan-ignore-next-line */
        $inv = Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $o->id,
            'invoice_status' => InvoiceStatus::Sent,
            'issued_on' => '2026-03-10',
            'total_pence' => 12_000,
        ]);

        Payment::query()->create([
            'company_id' => $company->id,
            'invoice_id' => $inv->id,
            'order_id' => null,
            'amount_pence' => 7_500,
            'payment_status' => PaymentStatus::PartPaid,
            'payment_method' => PaymentMethod::BankTransfer,
            'currency' => 'GBP',
            'paid_at' => Carbon::parse('2026-03-12 14:00:00', 'UTC'),
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/reports/sales?date_from=2026-03-01&date_to=2026-03-31&company_id='.$company->id);

        $res->assertOk();
        self::assertSame(7_500, (int) $res->json('data.kpis.paid_revenue_pence'));
        self::assertSame(1, (int) $res->json('data.kpis.payments_received_count'));
    }

    public function test_route_manager_can_access_knives_report_empty(): void
    {
        $user = User::factory()->create(['role' => UserRole::RouteManager]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/reports/knives');

        $res->assertOk()
            ->assertJsonPath('data.report', 'knives')
            ->assertJsonPath('data.kpis.knives_activity_count', 0)
            ->assertJsonPath('data.series.knives_by_day', [])
            ->assertJsonPath('data.series.knife_status_breakdown', [])
            ->assertJsonPath('data.table.rows', []);
    }

    public function test_finance_cannot_access_operations_knives_report(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/reports/knives')
            ->assertForbidden();
    }

    public function test_knives_report_counts_activity_reservice_and_damage(): void
    {
        $user = User::factory()->create(['role' => UserRole::RouteManager]);
        $company = Company::factory()->create();

        $booking = Booking::factory()->create([
            'company_id' => $company->id,
            'service_type' => ServiceType::Collection,
        ]);
        $order = Order::factory()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
        ]);

        $at = Carbon::parse('2026-03-15 12:00:00', 'UTC');

        /** @phpstan-ignore-next-line */
        $knifeChef = Knife::factory()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
            'order_id' => $order->id,
            'knife_type' => 'chef',
            'knife_status' => KnifeStatus::Sharpened,
            'updated_at' => $at,
        ]);
        /** @phpstan-ignore-next-line */
        $knifeParing = Knife::factory()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
            'order_id' => $order->id,
            'knife_type' => 'paring',
            'knife_status' => KnifeStatus::Received,
            'updated_at' => $at,
        ]);

        KnifeServiceAssignment::query()->create([
            'knife_id' => $knifeChef->id,
            'order_id' => $order->id,
            'company_id' => $company->id,
            'service_kind' => KnifeServiceKind::Reservice,
            'linked_at' => $at,
            'unlinked_at' => null,
        ]);

        DamageReport::factory()->create([
            'knife_id' => $knifeChef->id,
            'company_id' => $company->id,
            'order_id' => $order->id,
            'status' => DamageReportStatus::Open,
            'created_at' => $at,
            'updated_at' => $at,
        ]);

        $qs = 'date_from=2026-03-01&date_to=2026-03-31&company_id='.$company->id;

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/reports/knives?'.$qs);

        $res->assertOk();
        self::assertSame(2, (int) $res->json('data.kpis.knives_activity_count'));
        self::assertSame(1, (int) $res->json('data.kpis.knives_completed_workshop_count'));
        self::assertSame(1, (int) $res->json('data.kpis.reservice_assignments_count'));
        self::assertSame(1, (int) $res->json('data.kpis.damage_reports_created_count'));
        self::assertSame(2.0, (float) $res->json('data.kpis.average_knives_per_order'));

        $filtered = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/reports/knives?'.$qs.'&knife_type=chef');

        $filtered->assertOk();
        self::assertSame(1, (int) $filtered->json('data.kpis.knives_activity_count'));
    }

    public function test_export_placeholder_requires_finance_reports(): void
    {
        $finance = User::factory()->create(['role' => UserRole::Finance]);
        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/reports/export')
            ->assertOk()
            ->assertJsonPath('data.export.available', false);

        $driver = User::factory()->create(['role' => UserRole::RouteManager]);
        $this->withHeader('X-WeSharp-Test-User-Id', (string) $driver->id)
            ->getJson('/api/admin/reports/export')
            ->assertForbidden();
    }
}
