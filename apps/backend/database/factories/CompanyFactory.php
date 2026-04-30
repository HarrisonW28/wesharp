<?php

namespace Database\Factories;

use App\Enums\CompanyStatus;
use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->company();

        return [
            'name' => $name,
            'slug' => Str::slug($name.'-'.fake()->unique()->numerify('####')),
            'company_status' => fake()->randomElement(CompanyStatus::cases()),
            'phone' => fake()->phoneNumber(),
            'billing_email' => fake()->safeEmail(),
            'city' => fake()->city(),
        ];
    }
}
