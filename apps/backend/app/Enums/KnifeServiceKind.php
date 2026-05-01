<?php

namespace App\Enums;

enum KnifeServiceKind: string
{
    /** New blade registered directly on an order. */
    case Intake = 'intake';

    /** Blade was on file without an order and is linked to this order. */
    case InventoryLink = 'inventory_link';

    /** Blade returned from a completed/closed order and linked to a new order. */
    case Reservice = 'reservice';
}
