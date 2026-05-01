<?php

namespace App\Support\Knives;

use App\Enums\KnifeStatus;

/**
 * Valid status transitions for workshop knife tracking.
 */
final readonly class KnifeStatusTransitions
{
    /** @var array<string, list<string>> */
    private const EDGES = [
        KnifeStatus::Logged->value => [
            KnifeStatus::Received->value,
            KnifeStatus::Inspected->value,
            KnifeStatus::IssueReported->value,
            KnifeStatus::Cancelled->value,
        ],
        KnifeStatus::Received->value => [
            KnifeStatus::Inspected->value,
            KnifeStatus::IssueReported->value,
            KnifeStatus::Cancelled->value,
        ],
        KnifeStatus::Inspected->value => [
            KnifeStatus::Sharpening->value,
            KnifeStatus::IssueReported->value,
            KnifeStatus::Cancelled->value,
        ],
        KnifeStatus::Sharpening->value => [
            KnifeStatus::Sharpened->value,
            KnifeStatus::IssueReported->value,
            KnifeStatus::Cancelled->value,
        ],
        KnifeStatus::Sharpened->value => [
            KnifeStatus::QualityChecked->value,
            KnifeStatus::IssueReported->value,
            KnifeStatus::Cancelled->value,
        ],
        KnifeStatus::QualityChecked->value => [
            KnifeStatus::Returned->value,
            KnifeStatus::IssueReported->value,
            KnifeStatus::Cancelled->value,
        ],
        KnifeStatus::Returned->value => [],
        KnifeStatus::Cancelled->value => [],

        KnifeStatus::IssueReported->value => [
            KnifeStatus::Inspected->value,
            KnifeStatus::Sharpening->value,
            KnifeStatus::Sharpened->value,
        ],
    ];

    /**
     * @return list<KnifeStatus>
     */
    public static function nextStatuses(KnifeStatus $from): array
    {
        $targets = self::EDGES[$from->value] ?? [];

        return array_values(array_map(
            static fn (string $v): KnifeStatus => KnifeStatus::from($v),
            $targets
        ));
    }

    public static function canTransition(KnifeStatus $from, KnifeStatus $to): bool
    {
        if ($from === $to) {
            return true;
        }

        $targets = self::EDGES[$from->value] ?? [];

        return in_array($to->value, $targets, true);
    }

    public static function assertCan(KnifeStatus $from, KnifeStatus $to): void
    {
        if (self::canTransition($from, $to)) {
            return;
        }

        abort(422, sprintf('Invalid knife status transition: %s → %s.', $from->value, $to->value));
    }
}
