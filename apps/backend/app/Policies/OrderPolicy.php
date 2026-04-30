<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;
use App\Support\Permissions;

final class OrderPolicy
{
    public function viewAny(User $user): bool
    {
        return Permissions::userMay($user, Permissions::ORDERS_VIEW);
    }

    public function view(User $user, Order $order): bool
    {
        return Permissions::userMayForCompany($user, Permissions::ORDERS_VIEW, $order->company_id);
    }

    public function create(User $user): bool
    {
        return Permissions::userMay($user, Permissions::ORDERS_CREATE);
    }

    public function update(User $user, Order $order): bool
    {
        return Permissions::userMayForCompany($user, Permissions::ORDERS_UPDATE, $order->company_id);
    }

    public function complete(User $user, Order $order): bool
    {
        return Permissions::userMayForCompany($user, Permissions::ORDERS_UPDATE, $order->company_id);
    }

    /** Add single / bulk knives on an order manifest. */
    public function manipulateKnives(User $user, Order $order): bool
    {
        return Permissions::userMayForCompany($user, Permissions::KNIVES_UPDATE, $order->company_id)
            && Permissions::userMayForCompany($user, Permissions::ORDERS_UPDATE, $order->company_id);
    }
}
