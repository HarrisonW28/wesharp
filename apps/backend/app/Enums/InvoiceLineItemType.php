<?php

declare(strict_types=1);

namespace App\Enums;

enum InvoiceLineItemType: string
{
    case OneOffService = 'one_off_service';
    case Subscription = 'subscription';
    case Overage = 'overage';
    case Adjustment = 'adjustment';
}
