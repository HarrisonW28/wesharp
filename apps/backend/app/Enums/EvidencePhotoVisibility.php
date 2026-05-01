<?php

declare(strict_types=1);

namespace App\Enums;

enum EvidencePhotoVisibility: string
{
    case InternalOnly = 'internal_only';
    case CustomerVisible = 'customer_visible';
}
