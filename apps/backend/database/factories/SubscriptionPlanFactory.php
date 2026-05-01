<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\BillingInterval;
use App\Models\SubscriptionPlan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SubscriptionPlan>
 */
class SubscriptionPlanFactory extends Factory
{
    protected $model = SubscriptionPlan::class;

    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true).' Plan',
            'description' => fake()->optional(0.7)->sentence(),
            'billing_interval' => BillingInterval::Monthly,
            'price_amount_minor' => fake()->randomElement([4900, 9900, 14900, 19900]),
            'currency' => 'GBP',
            'included_collections' => fake()->randomElement([2, 4, 8]),
            'included_knife_allowance' => fake()->randomElement([20, 40, 80]),
            'overage_price_amount_minor' => fake()->optional(0.5)->randomElement([500, 800, 1200]),
            'is_active' => true,
            'sort_order' => fake()->numberBetween(0, 100),
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (): array => ['is_active' => false]);
    }
}
