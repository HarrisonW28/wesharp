<?php

namespace Database\Factories;

use App\Enums\PricingRuleKind;
use App\Enums\ServiceType;
use App\Models\PricingRule;
use App\Models\ServiceArea;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PricingRule>
 */
class PricingRuleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'service_area_id' => ServiceArea::factory(),
            'name' => fake()->words(3, true).' rate',
            'service_type' => fake()->randomElement(ServiceType::cases()),
            'rule_kind' => fake()->randomElement([PricingRuleKind::PerKnife->value, PricingRuleKind::FlatVisit->value]),
            'priority' => fake()->numberBetween(0, 50),
            'amount_pence' => fake()->numberBetween(350, 2500),
            'constraints' => [
                'weekday_only' => fake()->boolean(),
            ],
            'active' => true,
        ];
    }
}
