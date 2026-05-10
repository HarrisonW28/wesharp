<?php

declare(strict_types=1);

namespace Tests\Unit\Support\Costs;

use App\Enums\CostFrequency;
use App\Support\Costs\CostEquivalentCalculator;
use PHPUnit\Framework\TestCase;

final class CostEquivalentCalculatorTest extends TestCase
{
    public function test_weekly_amount_maps_to_four_point_three_three_monthly(): void
    {
        $weeklyPetrol = 6000;
        self::assertSame(25980, CostEquivalentCalculator::monthlyEquivalentPence($weeklyPetrol, CostFrequency::Weekly));
        self::assertSame(312000, CostEquivalentCalculator::annualEquivalentPence($weeklyPetrol, CostFrequency::Weekly));
    }

    public function test_monthly_and_quarterly_and_annual(): void
    {
        self::assertSame(1000, CostEquivalentCalculator::monthlyEquivalentPence(1000, CostFrequency::Monthly));
        self::assertSame(12000, CostEquivalentCalculator::annualEquivalentPence(1000, CostFrequency::Monthly));

        self::assertSame(4000, CostEquivalentCalculator::monthlyEquivalentPence(12000, CostFrequency::Quarterly));
        self::assertSame(48000, CostEquivalentCalculator::annualEquivalentPence(12000, CostFrequency::Quarterly));

        self::assertSame(10000, CostEquivalentCalculator::monthlyEquivalentPence(120000, CostFrequency::Annual));
        self::assertSame(120000, CostEquivalentCalculator::annualEquivalentPence(120000, CostFrequency::Annual));
    }

    public function test_non_periodic_frequencies_return_null(): void
    {
        self::assertNull(CostEquivalentCalculator::monthlyEquivalentPence(5000, CostFrequency::UsageBased));
        self::assertNull(CostEquivalentCalculator::annualEquivalentPence(5000, CostFrequency::OneTime));
    }
}
