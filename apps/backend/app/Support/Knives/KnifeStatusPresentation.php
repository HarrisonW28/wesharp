<?php

declare(strict_types=1);

namespace App\Support\Knives;

use App\Enums\KnifeStatus;

final class KnifeStatusPresentation
{
    public static function adminLabel(?KnifeStatus $status): string
    {
        if ($status === null) {
            return '—';
        }

        return match ($status) {
            KnifeStatus::Logged => 'Logged',
            KnifeStatus::Received => 'Received',
            KnifeStatus::Inspected => 'Inspected',
            KnifeStatus::Sharpening => 'Sharpening',
            KnifeStatus::Sharpened => 'Sharpened',
            KnifeStatus::QualityChecked => 'Quality checked',
            KnifeStatus::Returned => 'Returned',
            KnifeStatus::Cancelled => 'Cancelled',
            KnifeStatus::IssueReported => 'Issue reported',
        };
    }

    /** Customer portal — non-technical wording. */
    public static function customerLabel(?KnifeStatus $status): string
    {
        if ($status === null) {
            return '—';
        }

        return match ($status) {
            KnifeStatus::Logged => 'Registered',
            KnifeStatus::Received => 'With our workshop',
            KnifeStatus::Inspected => 'Inspected',
            KnifeStatus::Sharpening => 'Being sharpened',
            KnifeStatus::Sharpened => 'Finishing touches',
            KnifeStatus::QualityChecked => 'Final check',
            KnifeStatus::Returned => 'Returned to you',
            KnifeStatus::Cancelled => 'Not being serviced',
            KnifeStatus::IssueReported => "We're reviewing something",
        };
    }
}
