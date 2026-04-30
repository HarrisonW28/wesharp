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
            KnifeStatus::Collected->value,
            KnifeStatus::Inspected->value,
            KnifeStatus::IssueReported->value,
        ],
        KnifeStatus::Collected->value => [
            KnifeStatus::Inspected->value,
            KnifeStatus::IssueReported->value,
        ],
        KnifeStatus::Inspected->value => [
            KnifeStatus::Sharpened->value,
            KnifeStatus::IssueReported->value,
        ],
        KnifeStatus::Sharpened->value => [
            KnifeStatus::QualityChecked->value,
            KnifeStatus::IssueReported->value,
        ],
        KnifeStatus::QualityChecked->value => [
            KnifeStatus::Returned->value,
            KnifeStatus::IssueReported->value,
        ],
        KnifeStatus::Returned->value => [],

        KnifeStatus::IssueReported->value => [
            KnifeStatus::Inspected->value,
            KnifeStatus::Sharpened->value,
        ],
    ];

    public static function assertCan(KnifeStatus $from, KnifeStatus $to): void
    {
        if ($from === $to) {
            return;
        }

        $targets = self::EDGES[$from->value] ?? [];

        if (! in_array($to->value, $targets, true)) {
            abort(422, sprintf('Invalid knife status transition: %s → %s.', $from->value, $to->value));
        }
    }
}
