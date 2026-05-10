<?php

declare(strict_types=1);

namespace App\Enums;

enum ForecastScenarioType: string
{
    case Conservative = 'conservative';

    case Expected = 'expected';

    case Aggressive = 'aggressive';

    case Custom = 'custom';
}
