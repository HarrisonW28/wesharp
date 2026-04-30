<?php

namespace App\Enums;

enum KnifeStatus: string
{
    case Logged = 'logged';
    case Collected = 'collected';
    case Inspected = 'inspected';
    case Sharpened = 'sharpened';
    case QualityChecked = 'quality_checked';
    case Returned = 'returned';
    case IssueReported = 'issue_reported';
}
