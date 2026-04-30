<?php

namespace App\Enums;

enum BookingStatus: string
{
    case Requested = 'requested';
    case Confirmed = 'confirmed';
    case AssignedToRoute = 'assigned_to_route';
    case Collected = 'collected';
    case InSharpening = 'in_sharpening';
    case QualityChecked = 'quality_checked';
    case Returned = 'returned';
    case Completed = 'completed';
    case ConvertedToOrder = 'converted_to_order';
    case Cancelled = 'cancelled';
    case NoShow = 'no_show';
}
