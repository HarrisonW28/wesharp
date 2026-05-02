<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\InAppNotificationAudience;
use App\Enums\ServiceType;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\InAppNotification;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

final class InAppNotificationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
        Config::set('notifications.enabled', true);
        Config::set('notifications.email.queue', false);
    }

    public function test_admin_in_app_index_returns_staff_notifications_for_current_user(): void
    {
        Mail::fake();

        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->firstOrFail();
        $company->forceFill(['billing_email' => 'billing@example.test'])->save();
        $location = CompanyLocation::query()->where('company_id', $company->id)->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings', [
                'company_id' => $company->id,
                'location_id' => $location->id,
                'requested_date' => now()->addWeek()->toDateString(),
                'service_type' => ServiceType::Collection->value,
            ])
            ->assertCreated();

        $booking = Booking::query()->latest('created_at')->firstOrFail();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->getJson('/api/admin/notifications/in-app');

        $res->assertOk();
        $items = $res->json('data.items');
        self::assertIsArray($items);
        self::assertGreaterThanOrEqual(1, count($items));
        $first = $items[0];
        self::assertArrayHasKey('id', $first);
        self::assertStringContainsString((string) $booking->id, (string) ($first['path'] ?? ''));

        self::assertGreaterThanOrEqual(1, (int) $res->json('data.unread_count'));
    }

    public function test_account_in_app_index_returns_customer_notifications_only(): void
    {
        $customer = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();
        $other = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        InAppNotification::query()->create([
            'user_id' => $customer->id,
            'audience' => InAppNotificationAudience::Customer,
            'kind' => 'customer.booking.requested',
            'title' => 'Test customer',
            'body' => 'Hello',
            'path' => '/account/bookings/00000000-0000-0000-0000-000000000001',
            'dedupe_key' => 'test-customer-row:'.$customer->id,
        ]);

        InAppNotification::query()->create([
            'user_id' => $customer->id,
            'audience' => InAppNotificationAudience::Staff,
            'kind' => 'staff.booking.created',
            'title' => 'Should not list',
            'body' => 'Internal',
            'path' => '/admin/bookings',
            'dedupe_key' => 'test-staff-on-customer:'.$customer->id,
        ]);

        InAppNotification::query()->create([
            'user_id' => $other->id,
            'audience' => InAppNotificationAudience::Customer,
            'kind' => 'customer.other',
            'title' => 'Other user',
            'body' => 'X',
            'path' => '/account/dashboard',
            'dedupe_key' => 'test-other-user:'.$other->id,
        ]);

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $customer->id)
            ->getJson('/api/account/in-app-notifications');

        $res->assertOk();
        $titles = collect($res->json('data.items'))->pluck('title')->all();
        self::assertContains('Test customer', $titles);
        self::assertNotContains('Should not list', $titles);
        self::assertNotContains('Other user', $titles);
    }

    public function test_mark_read_updates_staff_notification(): void
    {
        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $n = InAppNotification::query()->create([
            'user_id' => $operator->id,
            'audience' => InAppNotificationAudience::Staff,
            'kind' => 'staff.test',
            'title' => 'Unread',
            'body' => 'Body',
            'path' => '/admin/dashboard',
            'dedupe_key' => 'staff-test-mark-read:'.$operator->id,
        ]);

        $patch = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->patchJson('/api/admin/notifications/in-app/'.$n->id, ['read' => true]);

        $patch->assertOk();
        self::assertNotNull($patch->json('data.read_at'));

        self::assertNotNull($n->fresh()->read_at);
    }
}
