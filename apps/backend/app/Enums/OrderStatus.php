<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Draft = 'draft';
    case Received = 'received';
    case Inspection = 'inspection';
    case InProgress = 'in_progress';
    case QualityCheck = 'quality_check';
    case Completed = 'completed';
    case Invoiced = 'invoiced';
    case Returned = 'returned';
    case Cancelled = 'cancelled';
}
