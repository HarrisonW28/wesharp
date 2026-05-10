<?php

declare(strict_types=1);

namespace App\Enums;

enum CostImportAppliedAction: string
{
    case Created = 'created';

    case Updated = 'updated';

    case Skipped = 'skipped';

    case Error = 'error';
}
