<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ReportExportApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_can_download_sales_invoices_csv(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);
        $company = Company::factory()->create();
        $booking = Booking::factory()->create(['company_id' => $company->id]);
        $order = Order::factory()->create(['company_id' => $company->id, 'booking_id' => $booking->id]);
        Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $order->id,
            'invoice_number' => 'INV-CSV-1',
            'invoice_status' => InvoiceStatus::Sent,
            'issued_on' => '2026-04-10',
            'total_pence' => 5000,
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->get('/api/admin/reports/exports/sales-invoices.csv?date_from=2026-04-01&date_to=2026-04-30');

        $res->assertOk();
        $res->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $csv = $res->streamedContent();
        self::assertStringContainsString('INV-CSV-1', $csv);
        self::assertStringContainsString('50.00', $csv);
    }

    public function test_route_manager_cannot_download_sales_csv(): void
    {
        $user = User::factory()->create(['role' => UserRole::RouteManager]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->get('/api/admin/reports/exports/sales-invoices.csv')
            ->assertForbidden();
    }

    public function test_route_manager_can_download_bookings_csv(): void
    {
        $user = User::factory()->create(['role' => UserRole::RouteManager]);
        $company = Company::factory()->create();
        Booking::factory()->create([
            'company_id' => $company->id,
            'created_at' => Carbon::parse('2026-05-01 12:00:00', 'UTC'),
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->get('/api/admin/reports/exports/bookings.csv?date_from=2026-05-01&date_to=2026-05-31');

        $res->assertOk();
        self::assertStringContainsString($company->name, $res->streamedContent());
    }

    public function test_finance_cannot_download_bookings_csv(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->get('/api/admin/reports/exports/bookings.csv')
            ->assertForbidden();
    }

    public function test_payments_csv_respects_company_filter(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);
        $c1 = Company::factory()->create();
        $c2 = Company::factory()->create();
        $b1 = Booking::factory()->create(['company_id' => $c1->id]);
        $o1 = Order::factory()->create(['company_id' => $c1->id, 'booking_id' => $b1->id]);
        $inv1 = Invoice::factory()->create([
            'company_id' => $c1->id,
            'order_id' => $o1->id,
            'invoice_status' => InvoiceStatus::Sent,
            'issued_on' => '2026-06-01',
            'total_pence' => 10_000,
        ]);
        $b2 = Booking::factory()->create(['company_id' => $c2->id]);
        $o2 = Order::factory()->create(['company_id' => $c2->id, 'booking_id' => $b2->id]);
        $inv2 = Invoice::factory()->create([
            'company_id' => $c2->id,
            'order_id' => $o2->id,
            'invoice_status' => InvoiceStatus::Sent,
            'issued_on' => '2026-06-01',
            'total_pence' => 10_000,
        ]);
        Payment::query()->create([
            'company_id' => $c1->id,
            'invoice_id' => $inv1->id,
            'order_id' => null,
            'amount_pence' => 1000,
            'payment_status' => PaymentStatus::PartPaid,
            'payment_method' => PaymentMethod::Card,
            'currency' => 'GBP',
            'paid_at' => Carbon::parse('2026-06-05 10:00:00', 'UTC'),
        ]);
        Payment::query()->create([
            'company_id' => $c2->id,
            'invoice_id' => $inv2->id,
            'order_id' => null,
            'amount_pence' => 2000,
            'payment_status' => PaymentStatus::PartPaid,
            'payment_method' => PaymentMethod::Card,
            'currency' => 'GBP',
            'paid_at' => Carbon::parse('2026-06-05 11:00:00', 'UTC'),
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->get('/api/admin/reports/exports/payments.csv?date_from=2026-06-01&date_to=2026-06-30&company_id='.$c1->id);

        $res->assertOk();
        $body = $res->streamedContent();
        self::assertStringContainsString('10.00', $body);
        self::assertStringNotContainsString('20.00', $body);
    }

    public function test_sales_invoices_csv_respects_city_filter(): void
    {
        $user = User::factory()->create(['role' => UserRole::Finance]);
        $london = Company::factory()->create(['city' => 'London']);
        $manchester = Company::factory()->create(['city' => 'Manchester']);
        foreach ([$london, $manchester] as $company) {
            $booking = Booking::factory()->create(['company_id' => $company->id]);
            $order = Order::factory()->create(['company_id' => $company->id, 'booking_id' => $booking->id]);
            Invoice::factory()->create([
                'company_id' => $company->id,
                'order_id' => $order->id,
                'invoice_number' => 'INV-CITY-'.$company->city,
                'invoice_status' => InvoiceStatus::Sent,
                'issued_on' => '2026-04-10',
                'total_pence' => 1000,
            ]);
        }

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->get('/api/admin/reports/exports/sales-invoices.csv?date_from=2026-04-01&date_to=2026-04-30&city=London');

        $res->assertOk();
        $csv = $res->streamedContent();
        self::assertStringContainsString('INV-CITY-London', $csv);
        self::assertStringNotContainsString('INV-CITY-Manchester', $csv);
    }
}
