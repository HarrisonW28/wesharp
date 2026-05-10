<?php

declare(strict_types=1);

namespace App\Enums;

enum CostAllocationMethod: string
{
    case DirectManual = 'direct_manual';
    case Percentage = 'percentage';
    case PerKnife = 'per_knife';
    case PerOrder = 'per_order';
    case PerRoute = 'per_route';
    case MonthlyOverhead = 'monthly_overhead';
}
