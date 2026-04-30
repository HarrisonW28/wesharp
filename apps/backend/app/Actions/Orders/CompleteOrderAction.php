<?php

namespace App\Actions\Orders;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Services\Audit\AuditRecorder;
use App\Support\Orders\OrderStatusTransitions;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class CompleteOrderAction
{
    public function execute(Order $order, ?Authenticatable $actor, ?Request $request): Order
    {
        return DB::transaction(function () use ($order, $actor, $request): Order {
            $order->refresh();

            OrderStatusTransitions::assertCan($order->order_status, OrderStatus::Completed);

            $from = $order->order_status;
            $order->order_status = OrderStatus::Completed;
            $order->save();

            AuditRecorder::record($actor, $order, 'order.completed', [
                'from' => $from->value,
                'to' => OrderStatus::Completed->value,
            ], $request);

            return $order->fresh();
        });
    }
}
