<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\CompanyStatus;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Company;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class PublicBookingEnquiryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_creates_lead_requested_booking_and_safe_json(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-01 12:00:00', 'UTC'));

        try {
            $preferred = Carbon::now()->addDays(2)->toDateString();

            $response = $this->postJson('/api/public/booking-enquiries', [
                'business_name' => 'Test Kitchen PLC',
                'contact_name' => 'Jamie Prep',
                'email' => 'jamie@testkitchen.example',
                'phone' => '+441234567890',
                'address_line_1' => '1 Wharf Street',
                'address_line_2' => 'Unit B',
                'city' => 'Manchester',
                'postcode' => 'M1 1AA',
                'estimated_knife_count' => 12,
                'preferred_date' => $preferred,
                'time_window_preference' => 'After lunch, 13:00–16:00',
                'service_type' => 'collection',
                'message' => 'Please collect chef knives from the prep area loading bay.',
                'terms_accepted' => true,
                'programme_interest' => 'unsure',
            ]);

            $response->assertCreated()
                ->assertJsonPath('success', true)
                ->assertJsonPath('data.accepted', true)
                ->assertJsonMissingPath('data.company_id');

            /** @phpstan-ignore-next-line */
            $company = Company::query()->where('billing_email', 'jamie@testkitchen.example')->firstOrFail();

            self::assertSame(CompanyStatus::Lead, $company->company_status);

            /** @phpstan-ignore-next-line */
            $booking = Booking::query()->where('company_id', $company->id)->latest('id')->firstOrFail();

            self::assertSame(BookingStatus::Requested, $booking->booking_status);
            self::assertSame(12, $booking->estimated_knife_count);
            self::assertStringContainsString('After lunch', (string) $booking->customer_notes);
            self::assertStringContainsString('Programme preference:', (string) $booking->customer_notes);

            self::assertTrue(
                AuditLog::query()
                    ->where('action', 'public.booking_enquiry')
                    ->where('auditable_type', Company::class)
                    ->exists()
            );
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_validation_rejects_invalid_email(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-01 12:00:00', 'UTC'));

        try {
            $preferred = Carbon::now()->addDays(2)->toDateString();

            $response = $this->postJson('/api/public/booking-enquiries', [
                'business_name' => 'Test Kitchen PLC',
                'contact_name' => 'Jamie Prep',
                'email' => 'not-an-email',
                'phone' => '+441234567890',
                'address_line_1' => '1 Wharf Street',
                'city' => 'Manchester',
                'postcode' => 'M1 1AA',
                'preferred_date' => $preferred,
                'time_window_preference' => 'Morning',
                'service_type' => 'collection',
                'message' => 'Need knives sharpened urgently please.',
                'terms_accepted' => true,
            ]);

            $response->assertStatus(422)
                ->assertJsonPath('success', false)
                ->assertJsonPath('error.code', 'validation_error');
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_store_requires_terms_accepted(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-01 12:00:00', 'UTC'));

        try {
            $preferred = Carbon::now()->addDays(2)->toDateString();

            $response = $this->postJson('/api/public/booking-enquiries', [
                'business_name' => 'Test Kitchen PLC',
                'contact_name' => 'Jamie Prep',
                'email' => 'jamie@testkitchen.example',
                'phone' => '+441234567890',
                'address_line_1' => '1 Wharf Street',
                'city' => 'Manchester',
                'postcode' => 'M1 1AA',
                'preferred_date' => $preferred,
                'time_window_preference' => 'Morning',
                'service_type' => 'collection',
                'message' => 'Short message goes here minimum ten.',
                'terms_accepted' => false,
            ]);

            $response->assertStatus(422)
                ->assertJsonPath('success', false)
                ->assertJsonPath('error.code', 'validation_error');
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_rate_limit_returns_429(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-01 12:00:00', 'UTC'));

        try {
            $preferred = Carbon::now()->addDays(2)->toDateString();

            $payload = [
                'business_name' => 'Rate Ltd',
                'contact_name' => 'Test User',
                'email' => 'rate@test.example',
                'phone' => '+441234567891',
                'address_line_1' => '2 Wharf Street',
                'city' => 'Manchester',
                'postcode' => 'M2 2BB',
                'preferred_date' => $preferred,
                'time_window_preference' => 'Any',
                'service_type' => 'collection',
                'message' => 'Need knives sharpened urgently please.',
                'terms_accepted' => true,
            ];

            for ($i = 0; $i < 10; $i++) {
                $payload['business_name'] = 'Rate Ltd '.$i;
                $payload['email'] = 'rate'.$i.'@test.example';
                $this->postJson('/api/public/booking-enquiries', $payload)->assertCreated();
            }

            $payload['business_name'] = 'Rate Ltd OVER';
            $payload['email'] = 'rateOVER@test.example';

            $this->postJson('/api/public/booking-enquiries', $payload)->assertStatus(429);
        } finally {
            Carbon::setTestNow();
        }
    }
}
