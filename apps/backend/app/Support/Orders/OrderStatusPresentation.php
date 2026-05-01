<?php

declare(strict_types=1);

namespace App\Support\Orders;

use App\Enums\OrderStatus;

/** Admin-facing labels (operational). */
final class OrderStatusPresentation
{
    public static function adminLabel(?OrderStatus $status): string
    {
        if ($status === null) {
            return '—';
        }

        return match ($status) {
            OrderStatus::Draft => 'Draft',
            OrderStatus::Received => 'Received',
            OrderStatus::Inspection => 'Inspection',
            OrderStatus::InProgress => 'In progress',
            OrderStatus::QualityCheck => 'Quality check',
            OrderStatus::Completed => 'Completed',
            OrderStatus::Invoiced => 'Invoiced',
            OrderStatus::Returned => 'Returned',
            OrderStatus::Cancelled => 'Cancelled',
        };
    }

    /** Customer portal — short, non-technical wording. */
    public static function customerLabel(?OrderStatus $status): string
    {
        if ($status === null) {
            return '—';
        }

        return match ($status) {
            OrderStatus::Draft => 'Being prepared',
            OrderStatus::Received => 'Received at our workshop',
            OrderStatus::Inspection => 'Inspecting your knives',
            OrderStatus::InProgress => 'Sharpening in progress',
            OrderStatus::QualityCheck => 'Final quality check',
            OrderStatus::Completed => 'Work finished',
            OrderStatus::Invoiced => 'Invoice issued',
            OrderStatus::Returned => 'Returned to you',
            OrderStatus::Cancelled => 'Cancelled',
        };
    }
}
