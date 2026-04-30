<?php

namespace App\Enums;

enum RouteStopStatus: string
{
    case NotStarted = 'not_started';
    case Travelling = 'travelling';
    case Arrived = 'arrived';
    case Collected = 'collected';
    case InSharpening = 'in_sharpening';
    case Returned = 'returned';
    case Completed = 'completed';
    case Skipped = 'skipped';
}
