<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Unpaid = 'unpaid';
    case PartPaid = 'part_paid';
    case Paid = 'paid';
    case Overdue = 'overdue';
    case Refunded = 'refunded';
    case WrittenOff = 'written_off';
}
