<?php

namespace Database\Factories;

use App\Enums\RouteStopStatus;
use App\Models\OperationalRoute;
use App\Models\RouteStop;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RouteStop>
 */
class RouteStopFactory extends Factory
{
    public function definition(): array
    {
        return [
            'route_id' => OperationalRoute::factory(),
            'booking_id' => null,
            'route_stop_status' => fake()->randomElement(RouteStopStatus::cases()),
            'sequence' => fake()->numberBetween(0, 25),
            'expected_arrival_at' => now()->addMinutes(fake()->numberBetween(10, 300)),
            'arrived_at' => null,
            'departed_at' => null,
        ];
    }
}
