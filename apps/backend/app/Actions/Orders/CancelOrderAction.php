<?php

declare(strict_types=1);

namespace App\Actions\Orders;

use App\Enums\InvoiceStatus;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Services\Audit\AuditRecorder;
use App\Support\Orders\OrderStatusTransitions;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class CancelOrderAction
{
    public function execute(Order $order, ?Authenticatable $actor, ?Request $request, ?string $reason = null): Order
    {
        return DB::transaction(function () use ($order, $actor, $request, $reason): Order {
            $order->refresh();

            if ($order->order_status === OrderStatus::Cancelled) {
                abort(422, 'This order is already cancelled.');
            }

            $blockingInvoice = $order->invoices()
                ->whereIn('invoice_status', [
                    InvoiceStatus::Sent->value,
                    InvoiceStatus::Paid->value,
                    InvoiceStatus::Overdue->value,
                ])
                ->exists();

            if ($blockingInvoice) {
                abort(422, 'Void or resolve sent/paid invoices before cancelling this order.');
            }

            OrderStatusTransitions::assertCan($order->order_status, OrderStatus::Cancelled);

            $from = $order->order_status;
            $order->order_status = OrderStatus::Cancelled;
            $order->save();

            AuditRecorder::record($actor, $order, 'order.cancelled', [
                'from' => $from->value,
                'to' => OrderStatus::Cancelled->value,
                'reason' => $reason,
            ], $request);

            return $order->fresh();
        });
    }
}
