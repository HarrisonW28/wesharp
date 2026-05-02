<?php

declare(strict_types=1);

namespace App\Enums;

enum NoteVisibility: string
{
    case Internal = 'internal';
    case Customer = 'customer';
    case Route = 'route';
    case Finance = 'finance';

    public function staffLabel(): string
    {
        return match ($this) {
            self::Internal => 'Internal (staff only)',
            self::Customer => 'Customer-visible',
            self::Route => 'Route / field team',
            self::Finance => 'Finance / billing',
        };
    }
}
