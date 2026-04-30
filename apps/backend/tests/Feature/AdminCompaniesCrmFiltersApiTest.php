<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\InvoiceStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\CompanySubscription;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdminCompaniesCrmFiltersApiTest extends TestCase
{
    use RefreshDatabase;

    private function adminHeaders(User $admin): array
    {
        return ['X-WeSharp-Test-User-Id' => (string) $admin->id];
    }

    public function test_index_filters_companies_with_unpaid_invoices(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $withOpen = Company::factory()->create();
        $locOpen = CompanyLocation::factory()->create(['company_id' => $withOpen->id]);
        $bookingOpen = Booking::factory()->create([
            'company_id' => $withOpen->id,
            'company_location_id' => $locOpen->id,
        ]);
        $orderOpen = Order::factory()->create([
            'company_id' => $withOpen->id,
            'booking_id' => $bookingOpen->id,
        ]);
        Invoice::factory()->create([
            'company_id' => $withOpen->id,
            'order_id' => $orderOpen->id,
            'invoice_status' => InvoiceStatus::Sent,
        ]);

        $paidOnly = Company::factory()->create();
        $locPaid = CompanyLocation::factory()->create(['company_id' => $paidOnly->id]);
        $bookingPaid = Booking::factory()->create([
            'company_id' => $paidOnly->id,
            'company_location_id' => $locPaid->id,
        ]);
        $orderPaid = Order::factory()->create([
            'company_id' => $paidOnly->id,
            'booking_id' => $bookingPaid->id,
        ]);
        Invoice::factory()->create([
            'company_id' => $paidOnly->id,
            'order_id' => $orderPaid->id,
            'invoice_status' => InvoiceStatus::Paid,
        ]);

        $response = $this->withHeaders($this->adminHeaders($admin))
            ->getJson('/api/admin/companies?has_unpaid_invoices=1&per_page=50');

        $response->assertOk();
        $ids = collect($response->json('data.items'))->pluck('id')->all();
        self::assertContains((string) $withOpen->id, $ids);
        self::assertNotContains((string) $paidOnly->id, $ids);
    }

    public function test_index_filters_companies_with_active_bookings(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $activeCo = Company::factory()->create();
        CompanyLocation::factory()->create(['company_id' => $activeCo->id]);
        Booking::factory()->create([
            'company_id' => $activeCo->id,
            'booking_status' => BookingStatus::Confirmed,
        ]);

        $terminalCo = Company::factory()->create();
        CompanyLocation::factory()->create(['company_id' => $terminalCo->id]);
        Booking::factory()->create([
            'company_id' => $terminalCo->id,
            'booking_status' => BookingStatus::Cancelled,
        ]);

        $response = $this->withHeaders($this->adminHeaders($admin))
            ->getJson('/api/admin/companies?has_active_bookings=1&per_page=50');

        $response->assertOk();
        $ids = collect($response->json('data.items'))->pluck('id')->all();
        self::assertContains((string) $activeCo->id, $ids);
        self::assertNotContains((string) $terminalCo->id, $ids);
    }

    public function test_index_filters_subscription_none_and_active(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $subscribed = Company::factory()->create();
        CompanySubscription::factory()->create([
            'company_id' => $subscribed->id,
            'status' => 'active',
        ]);

        $bare = Company::factory()->create();

        $none = $this->withHeaders($this->adminHeaders($admin))
            ->getJson('/api/admin/companies?subscription_status=none&per_page=50');
        $none->assertOk();
        $noneIds = collect($none->json('data.items'))->pluck('id')->all();
        self::assertContains((string) $bare->id, $noneIds);
        self::assertNotContains((string) $subscribed->id, $noneIds);

        $active = $this->withHeaders($this->adminHeaders($admin))
            ->getJson('/api/admin/companies?subscription_status=active&per_page=50');
        $active->assertOk();
        $activeIds = collect($active->json('data.items'))->pluck('id')->all();
        self::assertContains((string) $subscribed->id, $activeIds);
        self::assertNotContains((string) $bare->id, $activeIds);
    }

    public function test_show_includes_overview_users_subscription(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $company = Company::factory()->create();
        User::factory()->create([
            'company_id' => $company->id,
            'role' => UserRole::CustomerOwner,
            'status' => UserStatus::Active,
        ]);
        CompanySubscription::factory()->create(['company_id' => $company->id]);

        $response = $this->withHeaders($this->adminHeaders($admin))
            ->getJson('/api/admin/companies/'.$company->id);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'overview' => [
                        'default_location',
                        'primary_contact',
                        'latest_booking',
                        'active_order',
                        'unpaid_balance_pence',
                        'subscription',
                        'recent_activity',
                    ],
                    'users' => [],
                    'subscription' => [
                        'id',
                        'plan_name',
                        'status',
                        'status_label',
                    ],
                ],
            ]);
    }

    public function test_summary_includes_overview_blob(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::SuperAdmin,
            'status' => UserStatus::Active,
            'company_id' => null,
        ]);

        $company = Company::factory()->create();

        $response = $this->withHeaders($this->adminHeaders($admin))
            ->getJson('/api/admin/companies/'.$company->id.'/summary');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'overview' => [
                        'unpaid_balance_pence',
                        'recent_activity',
                    ],
                ],
            ]);
    }
}
