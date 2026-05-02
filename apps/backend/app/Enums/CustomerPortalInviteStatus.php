<?php

declare(strict_types=1);

namespace App\Enums;

enum CustomerPortalInviteStatus: string
{
    case Pending = 'pending';
    case Accepted = 'accepted';
    case Expired = 'expired';
    case Revoked = 'revoked';
}
