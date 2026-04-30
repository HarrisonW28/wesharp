<?php

namespace Database\Factories;

use App\Enums\BookingStatus;
use App\Enums\ServiceType;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanyLocation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Booking>
 */
class BookingFactory extends Factory
{
    public function configure(): static
    {
        return $this->afterMaking(function (Booking $booking): void {
            if (! $booking->company_id || $booking->company_location_id) {
                return;
            }

            $company = Company::query()->find($booking->company_id);

            if ($company === null) {
                return;
            }

            $location = $company->locations()->inRandomOrder()->first()
                ?? CompanyLocation::factory()->create(['company_id' => $company->id]);

            $booking->company_location_id = $location->id;
        });
    }

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'booking_status' => fake()->randomElement(BookingStatus::cases()),
            'service_type' => fake()->randomElement(ServiceType::cases()),
            'scheduled_date' => now()->addDays(fake()->numberBetween(1, 35))->toDateString(),
            'internal_notes' => fake()->boolean(35) ? fake()->sentence() : null,
        ];
    }
}
