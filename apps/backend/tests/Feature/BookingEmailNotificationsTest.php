<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\ServiceType;
use App\Http\Resources\BookingResource;
use App\Mail\GenericNotificationMailable;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\NotificationDelivery;
use App\Models\User;
use App\Services\Notifications\BookingEmailService;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

final class BookingEmailNotificationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);

        Config::set('notifications.enabled', true);
        Config::set('notifications.email.queue', false);
    }

    public function test_booking_requested_sends_email_and_logs_delivery(): void
    {
        Mail::fake();

        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->firstOrFail();
        $company->forceFill(['billing_email' => 'billing@example.test'])->save();
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

        $booking = Booking::query()->findOrFail($bookingId);

        Mail::assertSent(GenericNotificationMailable::class, 1);

        $row = NotificationDelivery::query()
            ->where('source_type', Booking::class)
            ->where('source_id', $booking->id)
            ->where('type', 'booking.requested')
            ->firstOrFail();

        self::assertSame('email', $row->channel);
        self::assertSame('sent', $row->status);
        self::assertNotNull($row->sent_at);
        self::assertSame(BookingResource::reference($booking), data_get($row->meta, 'booking_reference'));
    }

    public function test_booking_confirmed_sends_email_and_logs_delivery(): void
    {
        Mail::fake();

        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->firstOrFail();
        $company->forceFill(['billing_email' => 'billing@example.test'])->save();
        $location = CompanyLocation::query()->where('company_id', $company->id)->firstOrFail();

        $create = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings', [
                'company_id' => $company->id,
                'location_id' => $location->id,
                'requested_date' => now()->addWeek()->toDateString(),
                'service_type' => ServiceType::Collection->value,
            ]);

        $create->assertCreated();
        $bookingId = (string) $create->json('data.id');

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings/'.$bookingId.'/confirm', [
                'confirmed_time_window_start' => '09:00',
                'confirmed_time_window_end' => '11:00',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', BookingStatus::Confirmed->value);

        Mail::assertSent(GenericNotificationMailable::class, 2);

        $row = NotificationDelivery::query()
            ->where('source_type', Booking::class)
            ->where('source_id', $bookingId)
            ->where('type', 'booking.confirmed')
            ->firstOrFail();

        self::assertSame('sent', $row->status);
    }

    public function test_booking_cancelled_sends_email_and_logs_delivery(): void
    {
        Mail::fake();

        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->firstOrFail();
        $company->forceFill(['billing_email' => 'billing@example.test'])->save();
        $location = CompanyLocation::query()->where('company_id', $company->id)->firstOrFail();

        $create = $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings', [
                'company_id' => $company->id,
                'location_id' => $location->id,
                'requested_date' => now()->addWeek()->toDateString(),
                'service_type' => ServiceType::Collection->value,
            ]);

        $create->assertCreated();
        $bookingId = (string) $create->json('data.id');

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/bookings/'.$bookingId.'/cancel', [
                'reason' => 'Customer requested change.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', BookingStatus::Cancelled->value);

        Mail::assertSent(GenericNotificationMailable::class, 2);

        $row = NotificationDelivery::query()
            ->where('source_type', Booking::class)
            ->where('source_id', $bookingId)
            ->where('type', 'booking.cancelled')
            ->firstOrFail();

        self::assertSame('sent', $row->status);
    }

    public function test_booking_requested_is_idempotent_and_does_not_send_twice(): void
    {
        Mail::fake();

        $booking = Booking::factory()->create([
            'booking_status' => BookingStatus::Requested,
            'service_type' => ServiceType::Collection,
        ]);
        $booking->company()->update(['billing_email' => 'billing@example.test']);

        $svc = app(BookingEmailService::class);
        $svc->sendBookingRequested($booking);
        $svc->sendBookingRequested($booking);

        Mail::assertSent(GenericNotificationMailable::class, 1);

        self::assertSame(
            1,
            NotificationDelivery::query()
                ->where('source_type', Booking::class)
                ->where('source_id', $booking->id)
                ->where('type', 'booking.requested')
                ->count()
        );
    }
}

