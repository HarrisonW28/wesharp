<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\SubscriptionStatus;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\SubscriptionPlan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanySubscription>
 */
class CompanySubscriptionFactory extends Factory
{
    protected $model = CompanySubscription::class;

    public function configure(): static
    {
        return $this->afterCreating(function (CompanySubscription $sub): void {
            $sub->loadMissing('plan');
            if ($sub->plan === null) {
                return;
            }
            $sub->forceFill([
                'price_amount_minor_snapshot' => (int) $sub->plan->price_amount_minor,
                'currency' => (string) $sub->plan->currency,
            ])->save();
        });
    }

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'subscription_plan_id' => SubscriptionPlan::factory(),
            'status' => SubscriptionStatus::Active,
            'starts_at' => now()->toDateString(),
            'renews_at' => now()->addMonth()->toDateString(),
            'cancelled_at' => null,
            'billing_contact_id' => null,
            'price_amount_minor_snapshot' => 0,
            'currency' => 'GBP',
            'notes' => null,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (): array => [
            'status' => SubscriptionStatus::Draft,
            'renews_at' => null,
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (): array => [
            'status' => SubscriptionStatus::Cancelled,
            'cancelled_at' => now(),
            'renews_at' => null,
        ]);
    }
}
