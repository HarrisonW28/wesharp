<?php

declare(strict_types=1);

namespace App\Enums;

enum CostImportBatchStatus: string
{
    case Parsing = 'parsing';

    case PreviewReady = 'preview_ready';

    case Committed = 'committed';

    case Failed = 'failed';
}
