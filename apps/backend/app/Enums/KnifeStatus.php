<?php

namespace App\Enums;

enum KnifeStatus: string
{
    case Logged = 'logged';
    /** Workshop has the blade (replaces legacy `collected`). */
    case Received = 'received';
    case Inspected = 'inspected';
    case Sharpening = 'sharpening';
    case Sharpened = 'sharpened';
    case QualityChecked = 'quality_checked';
    case Returned = 'returned';
    case Cancelled = 'cancelled';
    case IssueReported = 'issue_reported';
}
