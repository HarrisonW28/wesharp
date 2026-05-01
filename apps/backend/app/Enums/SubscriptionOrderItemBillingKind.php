<?php

declare(strict_types=1);

namespace App\Enums;

enum SubscriptionOrderItemBillingKind: string
{
    /** Line is not part of knife-unit allowance split (legacy / non-workshop). */
    case Na = 'na';

    /** Knife workshop units consumed from included subscription allowance. */
    case Included = 'included';

    /** Knife workshop units billed at subscription overage rate. */
    case Overage = 'overage';
}
