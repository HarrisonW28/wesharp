<?php

declare(strict_types=1);

namespace App\Enums;

enum ConsumableInventoryStatus: string
{
    case Active = 'active';

    case Discontinued = 'discontinued';
}
