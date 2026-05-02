<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\OrderStatus;
use App\Enums\ServiceType;
use App\Enums\UserRole;
use App\Mail\GenericNotificationMailable;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\Contact;
use App\Models\NotificationDelivery;
use App\Models\Order;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\Subscriptions\OrderSubscriptionCoverageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

final class SubscriptionEmailNotificationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('notifications.enabled', true);
        Config::set('notifications.email.queue', false);
    }

    public function test_assign_subscription_sends_started_email(): void
    {
        Mail::fake();

        $user = User::factory()->create(['role' => UserRole::Finance]);
        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create(['is_active' => true]);
        $contact = Contact::factory()->create(['company_id' => $company->id, 'archived_at' => null]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->postJson(
            '/api/admin/companies/'.$company->id.'/subscriptions',
            [
                'subscription_plan_id' => $plan->id,
                'starts_at' => '2026-01-01',
                'renews_at' => '2026-02-01',
                'billing_contact_id' => $contact->id,
            ],
        )->assertCreated();

        Mail::assertSent(GenericNotificationMailable::class, 1);

        NotificationDelivery::query()
            ->where('source_type', CompanySubscription::class)
            ->where('type', 'subscription.started')
            ->firstOrFail();
    }

    public function test_compute_persist_sends_overage_email_when_collection_not_included(): void
    {
        Mail::fake();

        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create([
            'included_collections' => 0,
            'included_knife_allowance' => 20,
            'overage_price_amount_minor' => 500,
        ]);
        $contact = Contact::factory()->create(['company_id' => $company->id]);
        CompanySubscription::factory()->create([
            'company_id' => $company->id,
            'subscription_plan_id' => $plan->id,
            'starts_at' => now()->subDays(2),
            'renews_at' => now()->addMonth(),
            'billing_contact_id' => $contact->id,
        ]);

        $booking = Booking::factory()->create([
            'company_id' => $company->id,
            'service_type' => ServiceType::Collection,
            'booking_status' => BookingStatus::Confirmed,
        ]);
        $order = Order::factory()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
            'order_status' => OrderStatus::Completed,
            'completed_at' => now(),
            'knife_count' => 1,
        ]);

        app(OrderSubscriptionCoverageService::class)->computeAndPersist($order->fresh(['booking', 'items', 'knives', 'company']));

        Mail::assertSent(GenericNotificationMailable::class, 1);

        NotificationDelivery::query()
            ->where('source_type', CompanySubscription::class)
            ->where('type', 'subscription.usage.overage')
            ->firstOrFail();
    }

    public function test_renewal_reminder_command_targets_renews_at_offset(): void
    {
        Mail::fake();

        $this->travelTo('2026-01-01 10:00:00');

        Config::set('wesharp.subscription_renewal_reminder_days', 7);

        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company->id]);
        CompanySubscription::factory()->create([
            'company_id' => $company->id,
            'subscription_plan_id' => $plan->id,
            'starts_at' => '2025-12-01',
            'renews_at' => '2026-01-08',
            'billing_contact_id' => $contact->id,
        ]);

        $this->artisan('subscriptions:send-renewal-reminders')->assertSuccessful();

        Mail::assertSent(GenericNotificationMailable::class, 1);
        NotificationDelivery::query()
            ->where('type', 'subscription.renewal.upcoming')
            ->firstOrFail();
    }

    public function test_period_usage_summary_command_skips_when_disabled(): void
    {
        Mail::fake();
        Config::set('wesharp.subscription_period_summary_days_before_renewal', 0);

        $this->artisan('subscriptions:send-period-usage-summaries')->assertSuccessful();

        Mail::assertNothingSent();
    }

    public function test_period_usage_summary_command_queues_when_usage_present(): void
    {
        Mail::fake();

        $this->travelTo('2026-01-01 10:00:00');

        Config::set('wesharp.subscription_period_summary_days_before_renewal', 1);

        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create(['included_collections' => 2, 'included_knife_allowance' => 10]);
        $contact = Contact::factory()->create(['company_id' => $company->id]);
        CompanySubscription::factory()->create([
            'company_id' => $company->id,
            'subscription_plan_id' => $plan->id,
            'starts_at' => '2025-12-01',
            'renews_at' => '2026-01-02',
            'billing_contact_id' => $contact->id,
        ]);

        $booking = Booking::factory()->create([
            'company_id' => $company->id,
            'service_type' => ServiceType::Onsite,
            'booking_status' => BookingStatus::Confirmed,
        ]);
        $order = Order::factory()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
            'order_status' => OrderStatus::Completed,
            'completed_at' => '2025-12-15 12:00:00',
            'knife_count' => 2,
        ]);

        app(OrderSubscriptionCoverageService::class)->computeAndPersist($order->fresh(['booking', 'items', 'knives', 'company']));

        Mail::fake();

        $this->artisan('subscriptions:send-period-usage-summaries')->assertSuccessful();

        Mail::assertSent(GenericNotificationMailable::class, 1);

        NotificationDelivery::query()
            ->where('type', 'subscription.usage.period_summary')
            ->firstOrFail();
    }

    public function test_subscription_notifications_index_returns_deliveries(): void
    {
        Mail::fake();

        $user = User::factory()->create(['role' => UserRole::Finance]);
        $company = Company::factory()->create();
        $plan = SubscriptionPlan::factory()->create(['is_active' => true]);
        $contact = Contact::factory()->create(['company_id' => $company->id, 'archived_at' => null]);

        $assign = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)->postJson(
            '/api/admin/companies/'.$company->id.'/subscriptions',
            [
                'subscription_plan_id' => $plan->id,
                'starts_at' => '2026-01-01',
                'renews_at' => '2026-02-01',
                'billing_contact_id' => $contact->id,
            ],
        );
        $assign->assertCreated();
        $subId = (string) $assign->json('data.subscription.id');

        $res = $this->withHeader('X-WeSharp-Test-User-Id', (string) $user->id)
            ->getJson('/api/admin/companies/'.$company->id.'/subscriptions/'.$subId.'/notifications');

        $res->assertOk();
        self::assertGreaterThan(0, count((array) $res->json('data.items')));
        self::assertSame('subscription.started', $res->json('data.items.0.type'));
    }
}
