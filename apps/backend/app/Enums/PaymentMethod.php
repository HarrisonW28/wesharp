<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Card = 'card';
    case BankTransfer = 'bank_transfer';
    case Cash = 'cash';
    case Stripe = 'stripe';
    case Manual = 'manual';

    /** Cash / card / FPS not mapped to a PSP — staff-recorded. */
    case Other = 'other';
}
