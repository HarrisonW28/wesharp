<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\InAppNotificationAudience;
use App\Models\InAppNotification;
use App\Models\User;

final class InAppNotificationPolicy
{
    public function view(User $user, InAppNotification $notification): bool
    {
        if ((int) $notification->user_id !== (int) $user->getAuthIdentifier()) {
            return false;
        }

        if ($user->resolvedRole()->isCustomer()) {
            return $notification->audience === InAppNotificationAudience::Customer;
        }

        return $notification->audience === InAppNotificationAudience::Staff;
    }

    public function update(User $user, InAppNotification $notification): bool
    {
        return $this->view($user, $notification);
    }
}
