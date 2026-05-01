<?php

namespace Database\Factories;

use App\Enums\DamageReportStatus;
use App\Models\Company;
use App\Models\DamageReport;
use App\Models\Knife;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DamageReport>
 */
class DamageReportFactory extends Factory
{
    public function configure(): static
    {
        return $this->afterMaking(function (DamageReport $report): void {
            $knife = Knife::query()->find($report->knife_id);
            if ($knife !== null) {
                $report->company_id = $knife->company_id;
                if ($report->order_id === null && $knife->order_id !== null) {
                    $report->order_id = $knife->order_id;
                }
            }
        });
    }

    public function definition(): array
    {
        return [
            'knife_id' => Knife::factory(),
            'company_id' => Company::factory(),
            'order_id' => null,
            'details' => fake()->paragraph(),
            'internal_notes' => null,
            'customer_visible' => false,
            'customer_description' => null,
            'severity' => fake()->randomElement(['minor', 'moderate', 'needs_attention', 'severe']),
            'status' => DamageReportStatus::Open,
            'resolved_at' => null,
            'archived_at' => null,
            'reported_by_id' => User::factory(),
        ];
    }
}
