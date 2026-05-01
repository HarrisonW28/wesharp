<?php

declare(strict_types=1);

namespace App\Support\Orders;

use App\Enums\OrderStatus;

/** Allowed operational transitions — charge groups move forward via Actions, not mass-assigned on PUT. */
final readonly class OrderStatusTransitions
{
    /** @var array<string, list<string>> */
    private const EDGES = [
        OrderStatus::Draft->value => [
            OrderStatus::Received->value,
            OrderStatus::Completed->value,
            OrderStatus::Cancelled->value,
        ],
        OrderStatus::Received->value => [
            OrderStatus::Inspection->value,
            OrderStatus::Cancelled->value,
        ],
        OrderStatus::Inspection->value => [
            OrderStatus::InProgress->value,
            OrderStatus::Cancelled->value,
        ],
        OrderStatus::InProgress->value => [
            OrderStatus::QualityCheck->value,
            OrderStatus::Completed->value,
            OrderStatus::Cancelled->value,
        ],
        OrderStatus::QualityCheck->value => [
            OrderStatus::Completed->value,
            OrderStatus::Cancelled->value,
        ],
        OrderStatus::Completed->value => [
            OrderStatus::Invoiced->value,
            OrderStatus::Cancelled->value,
        ],
        OrderStatus::Invoiced->value => [
            OrderStatus::Returned->value,
            OrderStatus::Cancelled->value,
        ],
        OrderStatus::Returned->value => [],
        OrderStatus::Cancelled->value => [],
    ];

    /**
     * @return list<OrderStatus>
     */
    public static function nextStatuses(OrderStatus $from): array
    {
        $targets = self::EDGES[$from->value] ?? [];

        return array_values(array_map(
            static fn (string $v): OrderStatus => OrderStatus::from($v),
            $targets
        ));
    }

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
