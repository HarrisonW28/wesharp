<?php

namespace App\Enums;

enum DamageReportStatus: string
{
    case Open = 'open';
    case Resolved = 'resolved';
    case Archived = 'archived';
}
