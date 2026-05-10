<?php

declare(strict_types=1);

namespace App\Support\Routes;

use App\Actions\Knives\TransitionKnifeStatusAction;
use App\Actions\Orders\TransitionOrderStatusAction;
use App\Enums\KnifeStatus;
use App\Enums\OrderStatus;
use App\Models\Booking;
use App\Services\Orders\OrderService;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

/** When a collection stop completes, ensure manifest knives exist, then promote draft orders to received. */
final readonly class RouteStopOrderKnifeBootstrap
{
    public function __construct(
        private OrderService $orderService,
        private TransitionKnifeStatusAction $transitionKnifeStatusAction,
        private TransitionOrderStatusAction $transitionOrderStatusAction,
    ) {}

    public function afterBookingCollected(Booking $booking, ?Authenticatable $actor, ?Request $request): void
    {
        if ($actor === null || $request === null) {
            return;
        }

        $booking->loadMissing(['orders']);

        foreach ($booking->orders as $order) {
            $this->orderService->ensureKnivesAfterRouteCollection($order->fresh(['booking', 'knives']), $actor, $request);

            $freshOrder = $order->fresh(['booking', 'knives']);
            if ($freshOrder->order_status === OrderStatus::Draft) {
                $this->transitionOrderStatusAction->execute($freshOrder, OrderStatus::Received, $actor, $request);
            }
        }
    }

    public function afterBookingReturned(Booking $booking, ?Authenticatable $actor, ?Request $request): void
    {
        if ($actor === null || $request === null) {
            return;
        }

        $booking->loadMissing(['orders.knives']);

        foreach ($booking->orders as $order) {
            foreach ($order->knives as $knife) {
                $current = $knife->knife_status;
                if ($current === KnifeStatus::QualityChecked) {
                    $this->transitionKnifeStatusAction->execute($knife->fresh(), KnifeStatus::Returned, $actor, $request, null);
                }
            }
        }
    }
}
