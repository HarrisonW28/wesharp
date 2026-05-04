<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\OrderStatus;
use App\Enums\OrderPaymentStatus;
use App\Enums\PricingRuleKind;
use App\Enums\ServiceType;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use App\Models\Order;
use App\Models\PricingRule;
use App\Models\ServiceArea;
use App\Services\Pricing\PricingRuleResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class PricingRuleFirstOrderResolverTest extends TestCase
{
    use RefreshDatabase;

    public function test_uses_first_order_per_knife_when_company_has_no_terminal_orders(): void
    {
        $area = ServiceArea::factory()->create([
            'postcode_prefix' => 'M',
            'active' => true,
        ]);
        PricingRule::factory()->create([
            'service_area_id' => $area->id,
            'service_type' => ServiceType::Collection,
            'rule_kind' => PricingRuleKind::PerKnife,
            'priority' => 10,
            'amount_pence' => 1000,
            'constraints' => ['first_order_per_knife_pence' => 700],
            'active' => true,
        ]);

        $company = Company::factory()->create();
        CompanyLocation::factory()->create([
            'company_id' => $company->id,
            'postcode' => 'M1 1AA',
            'is_default' => true,
        ]);
        $booking = Booking::factory()->create([
            'company_id' => $company->id,
            'service_type' => ServiceType::Collection,
            'booking_status' => BookingStatus::Confirmed,
        ]);
        $order = Order::factory()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
            'order_status' => OrderStatus::Draft,
            'payment_status' => OrderPaymentStatus::Unpaid,
        ]);

        $unit = app(PricingRuleResolver::class)->defaultUnitAmountPenceForOrder($order);
        self::assertSame(700, $unit);
    }

    public function test_uses_standard_amount_after_completed_order(): void
    {
        $area = ServiceArea::factory()->create([
            'postcode_prefix' => 'M',
            'active' => true,
        ]);
        PricingRule::factory()->create([
            'service_area_id' => $area->id,
            'service_type' => ServiceType::Collection,
            'rule_kind' => PricingRuleKind::PerKnife,
            'priority' => 10,
            'amount_pence' => 1000,
            'constraints' => ['first_order_per_knife_pence' => 700],
            'active' => true,
        ]);

        $company = Company::factory()->create();
        CompanyLocation::factory()->create([
            'company_id' => $company->id,
            'postcode' => 'M1 1AA',
            'is_default' => true,
        ]);
        $priorBooking = Booking::factory()->create([
            'company_id' => $company->id,
            'service_type' => ServiceType::Collection,
            'booking_status' => BookingStatus::ConvertedToOrder,
        ]);
        Order::factory()->create([
            'company_id' => $company->id,
            'booking_id' => $priorBooking->id,
            'order_status' => OrderStatus::Completed,
            'payment_status' => OrderPaymentStatus::Unpaid,
        ]);

        $booking = Booking::factory()->create([
            'company_id' => $company->id,
            'service_type' => ServiceType::Collection,
            'booking_status' => BookingStatus::Confirmed,
        ]);
        $order = Order::factory()->create([
            'company_id' => $company->id,
            'booking_id' => $booking->id,
            'order_status' => OrderStatus::Draft,
            'payment_status' => OrderPaymentStatus::Unpaid,
        ]);

        $unit = app(PricingRuleResolver::class)->defaultUnitAmountPenceForOrder($order);
        self::assertSame(1000, $unit);
    }
}
