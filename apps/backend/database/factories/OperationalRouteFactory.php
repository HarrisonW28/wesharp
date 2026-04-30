<?php

namespace Database\Factories;

use App\Enums\OperationalRouteStatus;
use App\Models\OperationalRoute;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OperationalRoute>
 */
class OperationalRouteFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->streetName().' run',
            'route_status' => fake()->randomElement(OperationalRouteStatus::cases()),
            'scheduled_date' => now()->addDays(fake()->numberBetween(0, 14))->toDateString(),
            'driver_user_id' => User::factory(),
            'meta' => [
                'vehicle' => fake()->randomElement(['van-12', 'van-08']),
            ],
        ];
    }
}
