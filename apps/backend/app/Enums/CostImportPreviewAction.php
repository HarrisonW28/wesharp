<?php

declare(strict_types=1);

namespace App\Enums;

use App\Models\CostItem;

enum CostImportPreviewAction: string
{
    /** Will insert a new {@see CostItem}. */
    case WouldCreate = 'would_create';

    /** Will update an existing matched row. */
    case WouldUpdate = 'would_update';

    /** Blank row, subtotal, or intentionally ignored. */
    case WouldSkip = 'would_skip';

    /** Validation failed for this row. */
    case Invalid = 'invalid';
}
