<?php

declare(strict_types=1);

namespace App\Support\Orders;

use App\Actions\Knives\TransitionKnifeStatusAction;
use App\Enums\KnifeStatus;
use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

/** Keeps workshop knife rows aligned when an order moves forward in its lifecycle. */
final readonly class OrderKnifeStatusCoordinator
{
    public function __construct(
        private TransitionKnifeStatusAction $transitionKnifeStatusAction,
    ) {}

    public function syncKnivesForOrderStatus(Order $order, OrderStatus $to, ?Authenticatable $actor, ?Request $request): void
    {
        if ($actor === null || $request === null) {
            return;
        }

        if (in_array($to, [OrderStatus::Draft, OrderStatus::Cancelled], true)) {
            return;
        }

        /** @var list<array{0: KnifeStatus, 1: KnifeStatus}> $pairs */
        $pairs = match ($to) {
            OrderStatus::Received => [[KnifeStatus::Logged, KnifeStatus::Received]],
            OrderStatus::Inspection => [[KnifeStatus::Received, KnifeStatus::Inspected]],
            OrderStatus::InProgress => [[KnifeStatus::Inspected, KnifeStatus::Sharpening]],
            OrderStatus::QualityCheck => [
                [KnifeStatus::Sharpening, KnifeStatus::QualityChecked],
                [KnifeStatus::Sharpened, KnifeStatus::QualityChecked],
            ],
            OrderStatus::Returned => [[KnifeStatus::QualityChecked, KnifeStatus::Returned]],
            default => [],
        };

        if ($pairs === []) {
            return;
        }

        $order->loadMissing(['knives']);

        foreach ($pairs as [$from, $targetKnife]) {
            foreach ($order->knives as $knife) {
                $current = $knife->knife_status ?? KnifeStatus::Logged;
                if ($current !== $from) {
                    continue;
                }
                if (in_array($current, [KnifeStatus::Cancelled, KnifeStatus::Returned], true)) {
                    continue;
                }
                $this->transitionKnifeStatusAction->execute($knife->fresh(), $targetKnife, $actor, $request, null);
            }
        }
    }
}
