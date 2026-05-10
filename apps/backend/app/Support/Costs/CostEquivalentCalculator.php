<?php

declare(strict_types=1);

namespace App\Support\Costs;

use App\Enums\CostFrequency;

/**
 * Sprint 23.3 — workbook-aligned periodic equivalents (weekly uses 4.33 months/year convention).
 */
final class CostEquivalentCalculator
{
    /** @see docs/roadmap/sprint-23.md Sprint 23.3 */
    private const WEEKS_PER_MONTH = 4.33;

    public static function monthlyEquivalentPence(int $amountPence, CostFrequency $frequency): ?int
    {
        return match ($frequency) {
            CostFrequency::Weekly => (int) round($amountPence * self::WEEKS_PER_MONTH),
            CostFrequency::Monthly => $amountPence,
            CostFrequency::Quarterly => (int) round($amountPence / 3),
            CostFrequency::Annual => (int) round($amountPence / 12),
            default => null,
        };
    }

    public static function annualEquivalentPence(int $amountPence, CostFrequency $frequency): ?int
    {
        return match ($frequency) {
            CostFrequency::Weekly => (int) round($amountPence * 52),
            CostFrequency::Monthly => $amountPence * 12,
            CostFrequency::Quarterly => $amountPence * 4,
            CostFrequency::Annual => $amountPence,
            default => null,
        };
    }
}
