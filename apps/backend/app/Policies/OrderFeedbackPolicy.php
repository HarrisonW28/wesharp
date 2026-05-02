<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\OrderStatus;
use App\Models\OrderFeedback;
use App\Models\User;
use App\Support\Permissions;

final class OrderFeedbackPolicy
{
    public function view(User $user, OrderFeedback $feedback): bool
    {
        return Permissions::userMayForCompany($user, Permissions::ORDERS_VIEW, $feedback->company_id);
    }

    /** Tenant submits ratings — staff cannot use this path. */
    public function submit(User $user, OrderFeedback $feedback): bool
    {
        if (! $user->resolvedRole()->isCustomer()) {
            return false;
        }

        if (! Permissions::userMayForCompany($user, Permissions::ORDERS_VIEW, $feedback->company_id)) {
            return false;
        }

        if ($feedback->submitted_at !== null) {
            return false;
        }

        $feedback->loadMissing('order');

        return $feedback->order !== null && $feedback->order->order_status === OrderStatus::Completed;
    }

    /** Mark reviewed / approve marketing use (internal roles). */
    public function review(User $user, OrderFeedback $feedback): bool
    {
        if (! $user->resolvedRole()->isInternal()) {
            return false;
        }

        return Permissions::userMayForCompany($user, Permissions::ORDERS_VIEW, $feedback->company_id);
    }
}
