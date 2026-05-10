<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Internal cost cadence — aligns with WeSharp costs workbook “Frequency” column plus engine placeholders.
 */
enum CostFrequency: string
{
    case OneTime = 'one_time';

    case Weekly = 'weekly';

    case Monthly = 'monthly';

    case Quarterly = 'quarterly';

    case Annual = 'annual';

    case PerRoute = 'per_route';

    case PerOrder = 'per_order';

    case PerKnife = 'per_knife';

    case UsageBased = 'usage_based';

    /**
     * Map Cost Plan spreadsheet labels (case-insensitive) to enum cases.
     */
    public static function tryFromCostPlanLabel(?string $label): ?self
    {
        if ($label === null) {
            return null;
        }

        $n = strtolower(trim(str_replace(['_', '-'], ' ', $label)));

        return match ($n) {
            'one-time', 'one time', 'once', 'one_off', 'one-off', 'one off', 'oneoff' => self::OneTime,
            'weekly', 'week' => self::Weekly,
            'monthly', 'month' => self::Monthly,
            'quarterly', 'quarter', 'qtr', 'qtrly', 'every quarter' => self::Quarterly,
            'annual', 'annually', 'yearly', 'year', 'per year' => self::Annual,
            'usage', 'usage-based', 'usage based', 'variable', 'estimate' => self::UsageBased,
            'per route', 'route' => self::PerRoute,
            'per order', 'order' => self::PerOrder,
            'per knife', 'knife' => self::PerKnife,
            default => null,
        };
    }

    /**
     * Cadences that support Sprint 23.3 monthly/annual equivalent totals (spreadsheet burn rate).
     */
    public function hasPeriodicCommitmentEquivalents(): bool
    {
        return match ($this) {
            self::Weekly, self::Monthly, self::Quarterly, self::Annual => true,
            default => false,
        };
    }

    public function isRecurring(): bool
    {
        return $this !== self::OneTime;
    }
}
