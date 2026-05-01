<?php

declare(strict_types=1);

namespace App\Support\Knives;

use App\Enums\DamageReportSeverity;

final class DamageReportPresentation
{
    public static function customerSeverityLabel(?DamageReportSeverity $severity): string
    {
        if ($severity === null) {
            return 'Condition update';
        }

        return match ($severity) {
            DamageReportSeverity::Minor => 'Minor — light wear or small marks',
            DamageReportSeverity::Moderate => 'Moderate — visible wear we are working with',
            DamageReportSeverity::NeedsAttention => 'Notable — we may discuss this at pickup',
            DamageReportSeverity::Severe => 'Significant — we will confirm next steps with you',
        };
    }
}
