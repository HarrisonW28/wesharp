<?php

namespace Database\Factories;

use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Models\Booking;
use App\Models\Company;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    public function configure(): static
    {
        return $this->afterMaking(function (Order $order): void {
            if ($order->booking_id) {
                $booking = Booking::query()->find($order->booking_id);
                if ($booking !== null) {
                    $order->company_id = $booking->company_id;
                }
            }
        });
    }

    public function definition(): array
    {
        $subtotal = fake()->numberBetween(1_500, 15_000);
        $tax = (int) round($subtotal * 0.2);

        return [
            'company_id' => Company::factory(),
            'booking_id' => Booking::factory(),
            'route_id' => null,
            'order_status' => fake()->randomElement(OrderStatus::cases()),
            'knife_count' => 0,
            'price_per_knife_pence' => null,
            'discount_pence' => 0,
            'payment_status' => OrderPaymentStatus::Unpaid,
            'subtotal_pence' => $subtotal,
            'tax_pence' => $tax,
            'total_pence' => $subtotal + $tax,
            'currency' => 'GBP',
        ];
    }
}
