<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\CompanyLocation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanyLocation>
 */
class CompanyLocationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'label' => fake()->randomElement(['Main site', 'Kitchen', 'Warehouse', 'Shop floor']),
            'line_one' => fake()->streetAddress(),
            'line_two' => fake()->boolean(25) ? fake()->secondaryAddress() : null,
            'city' => fake()->city(),
            'postcode' => fake()->postcode(),
            'country' => 'GB',
            'latitude' => fake()->latitude(53.3, 53.5),
            'longitude' => fake()->longitude(-2.4, -2.1),
        ];
    }
}
