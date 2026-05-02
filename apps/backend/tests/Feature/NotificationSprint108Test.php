<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\ServiceType;
use App\Mail\GenericNotificationMailable;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\NotificationAdminSetting;
use App\Models\NotificationDelivery;
use App\Models\User;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

final class NotificationSprint108Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
        Config::set('notifications.enabled', true);
        Config::set('notifications.email.queue', false);
    }

    public function test_booking_email_skipped_when_recipient_user_opted_out(): void
    {
        Mail::fake();

        $portalUser = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->findOrFail($portalUser->company_id);
        $company->forceFill(['billing_email' => $portalUser->email])->save();
        User::query()->whereKey($portalUser->id)->update([
            'email_notification_preferences' => [
                'booking_updates' => false,
                'order_updates' => true,
                'subscription_digest' => true,
            ],
        ]);

        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $location = CompanyLocation::query()->where('company_id', $company->id)->firstOrFail();

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings', [
                'company_id' => $company->id,
                'location_id' => $location->id,
                'requested_date' => now()->addWeek()->toDateString(),
                'service_type' => ServiceType::Collection->value,
            ]);

        $res->assertCreated();
        $bookingId = (string) $res->json('data.id');

        Mail::assertNothingSent();

        $row = NotificationDelivery::query()
            ->where('source_type', Booking::class)
            ->where('source_id', $bookingId)
            ->where('type', 'booking.requested')
            ->firstOrFail();

        self::assertSame('skipped', $row->status);
        self::assertTrue((bool) data_get($row->meta, 'preference_skip'));
    }

    public function test_account_settings_round_trip_preferences(): void
    {
        $portalUser = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();

        $get = $this->withHeader('X-WeSharp-Test-User-Id', (string) $portalUser->id)
            ->getJson('/api/account/settings');

        $get->assertOk();
        $get->assertJsonPath('data.user.email_notification_preferences.booking_updates', true);

        $put = $this->withHeader('X-WeSharp-Test-User-Id', (string) $portalUser->id)
            ->putJson('/api/account/settings', [
                'user' => [
                    'email_notification_preferences' => [
                        'booking_updates' => false,
                        'order_updates' => true,
                        'subscription_digest' => false,
                    ],
                ],
            ]);

        $put->assertOk();
        $put->assertJsonPath('data.user.email_notification_preferences.booking_updates', false);
        $put->assertJsonPath('data.user.email_notification_preferences.subscription_digest', false);
    }

    public function test_finance_can_list_notification_deliveries_route_manager_cannot(): void
    {
        NotificationDelivery::query()->create([
            'channel' => 'email',
            'type' => 'invoice.issued',
            'status' => 'failed',
            'recipient_email' => 'x@example.test',
            'failure_reason' => 'Test failure',
        ]);

        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();
        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/notifications/deliveries?status=failed')
            ->assertOk()
            ->assertJsonPath('success', true);

        $driver = User::query()->where('email', 'driver@demo.wesharp.test')->firstOrFail();
        $this->withHeader('X-WeSharp-Test-User-Id', (string) $driver->id)
            ->getJson('/api/admin/notifications/deliveries')
            ->assertForbidden();
    }

    public function test_settings_manage_can_update_admin_notification_flags_and_preview_html(): void
    {
        $admin = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $admin->id)
            ->putJson('/api/admin/notifications/settings', [
                'respect_booking_notification_opt_out' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.respect_booking_notification_opt_out', false);

        $row = NotificationAdminSetting::current();
        self::assertFalse($row->respect_booking_notification_opt_out);

        $preview = $this->withHeader('X-WeSharp-Test-User-Id', (string) $admin->id)
            ->getJson('/api/admin/notifications/email-preview?preset=generic');

        $preview->assertOk();
        self::assertStringContainsString('Preview message', (string) $preview->json('data.html'));
    }

    public function test_finance_cannot_access_notification_settings_or_preview(): void
    {
        $finance = User::query()->where('email', 'finance@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/notifications/settings')
            ->assertForbidden();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $finance->id)
            ->getJson('/api/admin/notifications/email-preview')
            ->assertForbidden();
    }

    public function test_admin_override_sends_booking_email_when_respect_flag_off(): void
    {
        Mail::fake();

        NotificationAdminSetting::query()->update([
            'respect_booking_notification_opt_out' => false,
        ]);

        $portalUser = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->findOrFail($portalUser->company_id);
        $company->forceFill(['billing_email' => $portalUser->email])->save();
        User::query()->whereKey($portalUser->id)->update([
            'email_notification_preferences' => [
                'booking_updates' => false,
                'order_updates' => true,
                'subscription_digest' => true,
            ],
        ]);

        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $location = CompanyLocation::query()->where('company_id', $company->id)->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings', [
                'company_id' => $company->id,
                'location_id' => $location->id,
                'requested_date' => now()->addWeek()->toDateString(),
                'service_type' => ServiceType::Collection->value,
            ])
            ->assertCreated();

        Mail::assertSent(GenericNotificationMailable::class, 1);
    }
}
