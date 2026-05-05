<?php

declare(strict_types=1);

namespace App\Enums;

enum StripeCheckoutAttemptStatus: string
{
    case Pending = 'pending';
    case Completed = 'completed';
    case Expired = 'expired';
}
