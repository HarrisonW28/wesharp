<?php

declare(strict_types=1);

namespace App\Actions\Orders;

use App\Enums\KnifeStatus;
use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

/**
 * When every active blade on an order has reached the next workshop milestone, advance the order one step
 * so ops status tracks knife/route reality without an extra manual click.
 */
final readonly class MaybeAdvanceOrderStatusFromKnivesAction
{
    public function __construct(
        private TransitionOrderStatusAction $transitionOrderStatusAction,
    ) {}

    public function execute(Order $order, ?Authenticatable $actor, ?Request $request): void
    {
        if ($actor === null || $request === null) {
            return;
        }

        $order->refresh()->loadMissing(['knives']);

        if (in_array($order->order_status, [
            OrderStatus::Completed,
            OrderStatus::Cancelled,
            OrderStatus::Invoiced,
            OrderStatus::Returned,
        ], true)) {
            return;
        }

        /** @var \Illuminate\Support\Collection<int, \App\Models\Knife> $knives */
        $knives = $order->knives->filter(static fn ($k) => ($k->knife_status ?? null) !== KnifeStatus::Cancelled);

        if ($knives->isEmpty()) {
            return;
        }

        if ($knives->contains(static fn ($k) => ($k->knife_status ?? null) === KnifeStatus::IssueReported)) {
            return;
        }

        $tier = static function (KnifeStatus $s): int {
            return match ($s) {
                KnifeStatus::Logged => 0,
                KnifeStatus::Received => 1,
                KnifeStatus::Inspected => 2,
                KnifeStatus::Sharpening, KnifeStatus::Sharpened => 3,
                KnifeStatus::QualityChecked => 4,
                KnifeStatus::Returned => 5,
                KnifeStatus::Cancelled, KnifeStatus::IssueReported => 0,
            };
        };

        /** @var int $minTier */
        $minTier = $knives->min(static fn ($k): int => $tier($k->knife_status ?? KnifeStatus::Logged));

        $next = match (true) {
            $minTier >= 4 && $order->order_status === OrderStatus::InProgress => OrderStatus::QualityCheck,
            $minTier >= 3 && $order->order_status === OrderStatus::Inspection => OrderStatus::InProgress,
            $minTier >= 2 && $order->order_status === OrderStatus::Received => OrderStatus::Inspection,
            $minTier >= 1 && $order->order_status === OrderStatus::Draft => OrderStatus::Received,
            default => null,
        };

        if ($next === null) {
            return;
        }

        $this->transitionOrderStatusAction->execute($order->fresh(['knives']), $next, $actor, $request);
    }
}
