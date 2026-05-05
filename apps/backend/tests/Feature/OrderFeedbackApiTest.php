<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Mail\GenericNotificationMailable;
use App\Models\Company;
use App\Models\Booking;
use App\Models\CompanyLocation;
use App\Models\Contact;
use App\Models\Order;
use App\Models\OrderFeedback;
use App\Models\OrderItem;
use App\Models\User;
use App\Services\Orders\OrderFeedbackInvitationService;
use Database\Seeders\WeSharpDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

final class OrderFeedbackApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WeSharpDemoSeeder::class);
        Config::set('notifications.enabled', true);
        Config::set('notifications.email.queue', false);
    }

    public function test_completing_order_creates_feedback_invitation_and_sends_email(): void
    {
        Mail::fake();

        $operator = User::query()->where('email', 'operations@demo.wesharp.test')->firstOrFail();
        $customer = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->findOrFail($customer->company_id);
        $company->forceFill(['billing_email' => 'billing@example.test'])->save();

        $location = CompanyLocation::query()->where('company_id', $company->id)->firstOrFail();

        $booking = Booking::query()->create([
            'company_id' => $company->id,
            'company_location_id' => $location->id,
            'contact_id' => null,
            'booking_status' => \App\Enums\BookingStatus::Confirmed,
            'service_type' => \App\Enums\ServiceType::Collection,
            'scheduled_date' => now()->toDateString(),
        ]);

        $order = Order::query()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
            'order_status' => OrderStatus::QualityCheck,
            'payment_status' => \App\Enums\OrderPaymentStatus::Unpaid,
            'subtotal_pence' => 1000,
            'tax_pence' => 0,
            'total_pence' => 1000,
            'currency' => 'GBP',
            'knife_count' => 1,
            'price_per_knife_pence' => 1000,
        ]);

        OrderItem::query()->create([
            'order_id' => $order->id,
            'knife_id' => null,
            'description' => 'Test line',
            'quantity' => 1,
            'unit_amount_pence' => 1000,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $operator->id)
            ->postJson('/api/admin/orders/'.$order->id.'/transition', [
                'target_status' => OrderStatus::Completed->value,
            ])
            ->assertOk();

        Mail::assertSent(GenericNotificationMailable::class);

        $fb = OrderFeedback::query()->where('order_id', $order->id)->firstOrFail();
        self::assertNotNull($fb->invitation_sent_at);
        self::assertNull($fb->submitted_at);

        $customer = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $customer->id)
            ->postJson('/api/account/orders/'.$order->id.'/feedback', [
                'rating' => 5,
                'comment' => 'Great service',
                'testimonial_interested' => true,
            ])
            ->assertCreated();

        $fb->refresh();
        self::assertSame(5, $fb->rating);
        self::assertStringContainsString('Great service', (string) $fb->comment);
        self::assertTrue($fb->testimonial_interested);
        self::assertNotNull($fb->submitted_at);
    }

    public function test_feedback_invitation_dispatch_is_idempotent_when_service_run_twice(): void
    {
        Mail::fake();

        $customer = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->findOrFail($customer->company_id);
        $company->forceFill(['billing_email' => 'billing@example.test'])->save();

        $location = CompanyLocation::query()->where('company_id', $company->id)->firstOrFail();

        $booking = Booking::query()->create([
            'company_id' => $company->id,
            'company_location_id' => $location->id,
            'contact_id' => null,
            'booking_status' => \App\Enums\BookingStatus::Confirmed,
            'service_type' => \App\Enums\ServiceType::Collection,
            'scheduled_date' => now()->toDateString(),
        ]);

        $order = Order::query()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
            'order_status' => OrderStatus::Completed,
            'payment_status' => \App\Enums\OrderPaymentStatus::Unpaid,
            'subtotal_pence' => 1000,
            'tax_pence' => 0,
            'total_pence' => 1000,
            'currency' => 'GBP',
            'knife_count' => 1,
            'price_per_knife_pence' => 1000,
            'completed_at' => now(),
        ]);

        OrderItem::query()->create([
            'order_id' => $order->id,
            'knife_id' => null,
            'description' => 'Test line',
            'quantity' => 1,
            'unit_amount_pence' => 1000,
        ]);

        $order->load(['company', 'booking.contact']);
        $svc = app(OrderFeedbackInvitationService::class);
        $svc->inviteAfterOrderCompleted($order);
        $svc->inviteAfterOrderCompleted($order->fresh(['company', 'booking.contact']));

        Mail::assertSent(GenericNotificationMailable::class, 1);

        self::assertSame(
            1,
            OrderFeedback::query()->where('order_id', $order->id)->count(),
        );
    }

    public function test_duplicate_submit_returns_403(): void
    {
        $customer = User::query()->where('email', 'kitchen.portal@demo.wesharp.test')->firstOrFail();
        $company = Company::query()->findOrFail($customer->company_id);

        $location = CompanyLocation::query()->where('company_id', $company->id)->firstOrFail();
        $contact = Contact::query()->where('company_id', $company->id)->firstOrFail();

        $booking = Booking::query()->create([
            'company_id' => $company->id,
            'company_location_id' => $location->id,
            'contact_id' => $contact->id,
            'booking_status' => \App\Enums\BookingStatus::Confirmed,
            'service_type' => \App\Enums\ServiceType::Collection,
            'scheduled_date' => now()->toDateString(),
        ]);

        $order = Order::query()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
            'order_status' => OrderStatus::Completed,
            'payment_status' => \App\Enums\OrderPaymentStatus::Unpaid,
            'subtotal_pence' => 1000,
            'tax_pence' => 0,
            'total_pence' => 1000,
            'currency' => 'GBP',
            'knife_count' => 1,
            'price_per_knife_pence' => 1000,
            'completed_at' => now(),
        ]);

        OrderFeedback::query()->create([
            'order_id' => $order->id,
            'company_id' => $company->id,
            'invitation_sent_at' => now(),
            'submitted_at' => now(),
            'rating' => 4,
        ]);

        $this->withHeader('X-WeSharp-Test-User-Id', (string) $customer->id)
            ->postJson('/api/account/orders/'.$order->id.'/feedback', [
                'rating' => 5,
            ])
            ->assertForbidden();
    }
}
