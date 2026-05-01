<?php

namespace App\Actions\Orders;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Services\Audit\AuditRecorder;
use App\Services\Subscriptions\OrderSubscriptionCoverageService;
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
            $order->loadMissing(['items', 'knives']);

            if ($order->order_status === OrderStatus::Completed) {
                abort(422, 'This order is already completed.');
            }

            if ($order->items->isEmpty() && $order->knives->isEmpty()) {
                abort(422, 'Add at least one order line or knife before completing this order.');
            }

            OrderStatusTransitions::assertCan($order->order_status, OrderStatus::Completed);

            $from = $order->order_status;
            $order->order_status = OrderStatus::Completed;
            $order->completed_at = now();
            $order->save();

            AuditRecorder::record($actor, $order, 'order.completed', [
                'from' => $from->value,
                'to' => OrderStatus::Completed->value,
            ], $request);

            $order->refresh();
            app(OrderSubscriptionCoverageService::class)->computeAndPersist(
                $order->load(['booking', 'items', 'knives', 'company']),
            );

            return $order->fresh();
        });
    }
}
