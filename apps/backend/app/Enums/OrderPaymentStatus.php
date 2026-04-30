<?php

namespace App\Enums;

/** Order-side payment rollup (distinct from PSP `payments.payment_status`). */
enum OrderPaymentStatus: string
{
    case Unpaid = 'unpaid';
    case PartialPaid = 'partial';
    case Paid = 'paid';
    case Waived = 'waived';
    case Refunded = 'refunded';
}
