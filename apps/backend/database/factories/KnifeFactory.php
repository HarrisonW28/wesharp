<?php

namespace Database\Factories;

use App\Enums\KnifeStatus;
use App\Models\Company;
use App\Models\Knife;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Knife>
 */
class KnifeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'booking_id' => null,
            'order_id' => null,
            'tag_id' => 'WS-'.str_replace('-', '', (string) Str::uuid()),
            'knife_status' => fake()->randomElement(KnifeStatus::cases()),
            'knife_type' => fake()->randomElement(['chef', 'paring', 'serrated', 'boning']),
            'description' => 'Blade '.fake()->numerify('###'),
            'label' => 'Blade '.fake()->numerify('###'),
            'position' => fake()->numberBetween(1, 80),
            'notes' => fake()->boolean(35) ? fake()->sentence() : null,
        ];
    }
}
