<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminAuditLogsApiTest extends TestCase
{
    use RefreshDatabase;

    private function staffHeaders(User $user): array
    {
        return ['X-WeSharp-Test-User-Id' => (string) $user->id];
    }

    public function test_super_admin_lists_audit_logs_with_redacted_payloads(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $company = Company::factory()->create();
        $log = AuditLog::factory()->create([
            'actor_id' => $admin->id,
            'auditable_type' => Company::class,
            'auditable_id' => $company->id,
            'action' => 'company.updated',
            'payload' => [
                'before' => ['name' => 'A'],
                'after' => ['name' => 'B'],
                'api_secret' => 'should-redact',
            ],
        ]);

        $response = $this->withHeaders($this->staffHeaders($admin))
            ->getJson('/api/admin/audit-logs?per_page=10');

        $response->assertOk();
        $items = $response->json('data.items');
        self::assertIsArray($items);
        $hit = collect($items)->firstWhere('id', (string) $log->id);
        self::assertNotNull($hit);
        self::assertSame('Company updated', $hit['action_label']);
        self::assertSame('[redacted]', $hit['payload']['api_secret']);
        self::assertContains('name', $hit['changed_fields']);
        self::assertArrayHasKey('company', $hit);
        self::assertSame((string) $company->id, $hit['company']['id']);
    }

    public function test_finance_scope_excludes_booking_only_audits(): void
    {
        $finance = User::factory()->create([
            'role' => UserRole::Finance,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $company = Company::factory()->create();
        $loc = CompanyLocation::factory()->create(['company_id' => $company->id]);
        $booking = Booking::factory()->create([
            'company_id' => $company->id,
            'company_location_id' => $loc->id,
        ]);
        $bookingAudit = AuditLog::factory()->create([
            'actor_id' => $finance->id,
            'auditable_type' => Booking::class,
            'auditable_id' => $booking->id,
            'action' => 'booking.confirmed',
        ]);

        $order = Order::factory()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
        ]);
        $invoice = Invoice::factory()->create([
            'company_id' => $company->id,
            'order_id' => $order->id,
        ]);
        $invoiceAudit = AuditLog::factory()->create([
            'actor_id' => $finance->id,
            'auditable_type' => Invoice::class,
            'auditable_id' => $invoice->id,
            'action' => 'invoice.updated_meta',
        ]);

        $response = $this->withHeaders($this->staffHeaders($finance))
            ->getJson('/api/admin/audit-logs?per_page=50');

        $response->assertOk();
        $ids = collect($response->json('data.items'))->pluck('id')->all();
        self::assertContains((string) $invoiceAudit->id, $ids);
        self::assertNotContains((string) $bookingAudit->id, $ids);
    }

    public function test_route_manager_sees_booking_audits(): void
    {
        $rm = User::factory()->create([
            'role' => UserRole::RouteManager,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $company = Company::factory()->create();
        $loc = CompanyLocation::factory()->create(['company_id' => $company->id]);
        $booking = Booking::factory()->create([
            'company_id' => $company->id,
            'company_location_id' => $loc->id,
        ]);
        $bookingAudit = AuditLog::factory()->create([
            'actor_id' => $rm->id,
            'auditable_type' => Booking::class,
            'auditable_id' => $booking->id,
            'action' => 'booking.confirmed',
        ]);

        $response = $this->withHeaders($this->staffHeaders($rm))
            ->getJson('/api/admin/audit-logs?per_page=50');

        $response->assertOk();
        $ids = collect($response->json('data.items'))->pluck('id')->all();
        self::assertContains((string) $bookingAudit->id, $ids);
    }

    public function test_customer_cannot_access_admin_audit_logs(): void
    {
        $company = Company::factory()->create();
        $customer = User::factory()->create([
            'role' => UserRole::CustomerOwner,
            'status' => UserStatus::Active,
            'company_id' => $company->id,
        ]);

        $response = $this->withHeaders($this->staffHeaders($customer))
            ->getJson('/api/admin/audit-logs');

        $response->assertForbidden();
    }
}
