<?php

declare(strict_types=1);

namespace App\Enums;

enum PricingRuleKind: string
{
    /** Amount applies per knife / billable workshop line. */
    case PerKnife = 'per_knife';

    /** Flat amount per visit (used for reference; line intake still uses per-unit pricing or manual entry). */
    case FlatVisit = 'flat_visit';
}
