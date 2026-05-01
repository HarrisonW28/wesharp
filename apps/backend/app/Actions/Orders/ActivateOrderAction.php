<?php

declare(strict_types=1);

namespace App\Actions\Orders;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Services\Audit\AuditRecorder;
use App\Support\Orders\OrderStatusTransitions;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ActivateOrderAction
{
    public function execute(Order $order, ?Authenticatable $actor, ?Request $request): Order
    {
        return DB::transaction(function () use ($order, $actor, $request): Order {
            $order->refresh();

            if ($order->order_status !== OrderStatus::Draft) {
                abort(422, 'Only draft orders can be marked active.');
            }

            OrderStatusTransitions::assertCan($order->order_status, OrderStatus::Active);

            $from = $order->order_status;
            $order->order_status = OrderStatus::Active;
            $order->save();

            AuditRecorder::record($actor, $order, 'order.activated', [
                'from' => $from->value,
                'to' => OrderStatus::Active->value,
            ], $request);

            return $order->fresh();
        });
    }
}
