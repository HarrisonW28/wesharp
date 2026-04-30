<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderItem>
 */
class OrderItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'sku' => 'EDGE-'.fake()->bothify('##??'),
            'description' => fake()->sentence(4),
            'quantity' => fake()->numberBetween(1, 5),
            'unit_amount_pence' => fake()->numberBetween(500, 2_500),
        ];
    }
}
