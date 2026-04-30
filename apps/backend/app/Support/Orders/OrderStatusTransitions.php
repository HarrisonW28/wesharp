<?php

namespace App\Support\Orders;

use App\Enums\OrderStatus;

/** Allowed operational transitions for charge groupings (not mass-assigned on PUT). */
final readonly class OrderStatusTransitions
{
    /** @var array<string, list<string>> */
    private const EDGES = [
        OrderStatus::Draft->value => [
            OrderStatus::Active->value,
            OrderStatus::Completed->value,
            OrderStatus::Cancelled->value,
        ],
        OrderStatus::Active->value => [
            OrderStatus::Completed->value,
            OrderStatus::Cancelled->value,
        ],
        OrderStatus::Completed->value => [],
        OrderStatus::Cancelled->value => [],
    ];

    public static function assertCan(OrderStatus $from, OrderStatus $to): void
    {
        if ($from === $to) {
            return;
        }

        $targets = self::EDGES[$from->value] ?? [];

        if (! in_array($to->value, $targets, true)) {
            abort(422, sprintf('Invalid order status transition: %s → %s.', $from->value, $to->value));
        }
    }
}
