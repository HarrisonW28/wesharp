<?php

namespace Database\Factories;

use App\Models\Payment;
use App\Models\Refund;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Refund>
 */
class RefundFactory extends Factory
{
    public function definition(): array
    {
        return [
            'payment_id' => Payment::factory(),
            'amount_pence' => fake()->numberBetween(500, 8_000),
            'reason' => fake()->sentence(),
            'processed_at' => fake()->boolean(80) ? now() : null,
        ];
    }
}
