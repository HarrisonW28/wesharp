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
            'order_id' => null,
            'uploaded_file_id' => null,
            'uploaded_by_user_id' => null,
            'sort_order' => fake()->numberBetween(0, 5),
            'caption' => fake()->boolean(40) ? fake()->sentence() : null,
            'photo_kind' => 'general',
        ];
    }
}
