<?php

namespace App\Enums;

enum DamageReportSeverity: string
{
    case Minor = 'minor';
    case Moderate = 'moderate';
    case NeedsAttention = 'needs_attention';
    case Severe = 'severe';
}
