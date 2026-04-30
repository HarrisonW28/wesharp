<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\CompanySubscription;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanySubscription>
 */
class CompanySubscriptionFactory extends Factory
{
    protected $model = CompanySubscription::class;

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'plan_name' => 'WeSharp Kitchen Care',
            'status' => 'active',
            'current_period_end' => now()->addMonth()->toDateString(),
            'included_services' => 'Scheduled collections, blade logging, standard sharpening.',
            'allowance_summary' => 'Up to 4 collection visits per month.',
        ];
    }
}
