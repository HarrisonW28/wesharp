<?php

namespace Database\Factories;

use App\Models\ServiceArea;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ServiceArea>
 */
class ServiceAreaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->city().' service cell',
            'city' => fake()->city(),
            'region' => fake()->randomElement(['Greater Manchester', 'Merseyside']),
            'country' => 'GB',
            'postcode_prefix' => fake()->randomElement(['M', 'L']).fake()->numerify('#'),
            'active' => true,
        ];
    }
}
