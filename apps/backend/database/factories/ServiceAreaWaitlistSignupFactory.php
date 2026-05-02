<?php

namespace Database\Factories;

use App\Models\ServiceAreaWaitlistSignup;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ServiceAreaWaitlistSignup>
 */
class ServiceAreaWaitlistSignupFactory extends Factory
{
    protected $model = ServiceAreaWaitlistSignup::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->safeEmail(),
            'postcode' => 'B1 1AA',
            'postcode_normalized' => 'B11AA',
            'customer_type' => 'home',
            'estimated_knife_count' => null,
            'notes' => null,
        ];
    }
}
