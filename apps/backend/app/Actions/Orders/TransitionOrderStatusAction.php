<?php

declare(strict_types=1);

namespace App\Actions\Orders;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Services\Audit\AuditRecorder;
use App\Services\Notifications\OrderEmailService;
use App\Support\Orders\OrderKnifeStatusCoordinator;
use App\Support\Orders\OrderStatusTransitions;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Single-step status move (excludes complete/cancel, which have dedicated Actions). */
final class TransitionOrderStatusAction
{
    public function __construct(
        private readonly OrderEmailService $orderEmails,
        private readonly OrderKnifeStatusCoordinator $orderKnifeStatusCoordinator,
    ) {}

    public function execute(
        Order $order,
        OrderStatus $target,
        ?Authenticatable $actor,
        ?Request $request,
    ): Order {
        if ($target === OrderStatus::Completed || $target === OrderStatus::Cancelled) {
            abort(500, 'Use CompleteOrderAction or CancelOrderAction.');
        }

        /** @var array{order: Order, changed: bool} $result */
        $result = DB::transaction(function () use ($order, $target, $actor, $request): array {
            $order->refresh();

            if ($order->order_status === $target) {
                return ['order' => $order->fresh(), 'changed' => false];
            }

            OrderStatusTransitions::assertCan($order->order_status, $target);

            $from = $order->order_status;
            $order->order_status = $target;
            $order->save();

            AuditRecorder::record($actor, $order, 'order.status_changed', [
                'from' => $from->value,
                'to' => $target->value,
            ], $request);

            $this->orderKnifeStatusCoordinator->syncKnivesForOrderStatus(
                $order->fresh(['knives']),
                $target,
                $actor,
                $request,
            );

            return ['order' => $order->fresh(), 'changed' => true];
        });

        if ($result['changed']) {
            $this->orderEmails->sendStatusReached(
                $result['order']->fresh(['company', 'booking.contact']),
                $target,
            );
        }

        return $result['order'];
    }
}
