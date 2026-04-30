<?php

namespace Database\Factories;

use App\Models\Knife;
use App\Models\KnifePhoto;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<KnifePhoto>
 */
class KnifePhotoFactory extends Factory
{
    public function definition(): array
    {
        return [
            'knife_id' => Knife::factory(),
            'uploaded_file_id' => null,
            'sort_order' => fake()->numberBetween(0, 5),
            'caption' => fake()->boolean(40) ? fake()->sentence() : null,
        ];
    }
}
