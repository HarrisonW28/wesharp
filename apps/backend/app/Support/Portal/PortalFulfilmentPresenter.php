<?php

declare(strict_types=1);

namespace App\Support\Portal;

use App\Enums\BookingStatus;
use App\Enums\OperationalRouteStatus;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Enums\RouteStopStatus;
use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Order;
use Carbon\CarbonInterface;

/**
 * Customer-safe fulfilment timeline and route summary (no route names, driver IDs, or stop UUIDs).
 */
final class PortalFulfilmentPresenter
{
    /**
     * @return array{
     *   timeline: list<array{step_key: string, label: string, description?: string, at?: string, state: string}>,
     *   route: ?array{
     *     collection_date: ?string,
     *     collection_window_start: ?string,
     *     collection_window_end: ?string,
     *     collected_at: ?string,
     *     returned_at: ?string,
     *   }
     * }
     */
    public static function forOrder(Order $order): array
    {
        $order->loadMissing([
            'booking.routeStop',
            'booking.assignedRoute',
            'invoices' => fn ($q) => $q->orderByDesc('created_at')->limit(1),
        ]);

        if ($order->order_status === OrderStatus::Cancelled) {
            return [
                'timeline' => self::terminalTimeline('cancelled', 'Order cancelled', 'This order will not be processed further.'),
                'route' => null,
            ];
        }

        $booking = $order->booking;
        $stop = $booking?->routeStop;

        if ($booking?->booking_status === BookingStatus::Cancelled) {
            return [
                'timeline' => self::terminalTimeline('cancelled', 'Booking cancelled', 'This visit will not go ahead.'),
                'route' => self::routeSummary($booking, $stop),
            ];
        }

        if ($booking?->booking_status === BookingStatus::NoShow) {
            return [
                'timeline' => self::terminalTimeline('no_show', 'Collection could not be completed', 'Please contact us to rearrange.'),
                'route' => self::routeSummary($booking, $stop),
            ];
        }

        if ($booking === null) {
            $timeline = self::resolveStates(self::orderOnlyStepDefs($order));
            $timeline = self::appendInvoiceStep($timeline, $order);
        } else {
            $timeline = self::resolveStates(self::bookingOrderStepDefs($order, $booking, $stop));
            $timeline = self::appendInvoiceStep($timeline, $order);
        }

        return [
            'timeline' => $timeline,
            'route' => self::routeSummary($booking, $stop),
        ];
    }

    /**
     * @return array{
     *   timeline: list<array{step_key: string, label: string, description?: string, at?: string, state: string}>,
     *   route: ?array{
     *     collection_date: ?string,
     *     collection_window_start: ?string,
     *     collection_window_end: ?string,
     *     collected_at: ?string,
     *     returned_at: ?string,
     *   }
     * }
     */
    public static function forBooking(Booking $booking): array
    {
        $booking->loadMissing(['routeStop', 'assignedRoute']);

        $stop = $booking->routeStop;

        if ($booking->booking_status === BookingStatus::Cancelled) {
            return [
                'timeline' => self::terminalTimeline('cancelled', 'Booking cancelled', 'This visit will not go ahead.'),
                'route' => self::routeSummary($booking, $stop),
            ];
        }

        if ($booking->booking_status === BookingStatus::NoShow) {
            return [
                'timeline' => self::terminalTimeline('no_show', 'Collection could not be completed', 'Please contact us to rearrange.'),
                'route' => self::routeSummary($booking, $stop),
            ];
        }

        return [
            'timeline' => self::resolveStates(self::bookingOnlyStepDefs($booking, $stop)),
            'route' => self::routeSummary($booking, $stop),
        ];
    }

    /**
     * @param  \App\Models\RouteStop|null  $stop
     * @return list<array{step_key: string, label: string, description?: string, at?: \Closure(): ?string, done: \Closure(): bool}>
     */
    private static function bookingOrderStepDefs(Order $order, Booking $booking, $stop): array
    {
        $bs = $booking->booking_status;
        $st = $stop?->route_stop_status;
        $route = $booking->assignedRoute;
        $routeLive = $route !== null && $route->route_status === OperationalRouteStatus::InProgress;

        return [
            [
                'step_key' => 'booking_requested',
                'label' => 'Booking received',
                'description' => 'We have your collection request.',
                'at' => static fn (): ?string => $booking->created_at?->toIso8601String(),
                'done' => static fn (): bool => true,
            ],
            [
                'step_key' => 'booking_confirmed',
                'label' => 'Booking confirmed',
                'description' => 'Your appointment is locked in.',
                'at' => static fn (): ?string => ! in_array($bs, [BookingStatus::Requested], true)
                    ? $booking->updated_at?->toIso8601String()
                    : null,
                'done' => static fn (): bool => in_array($bs, [
                    BookingStatus::Confirmed,
                    BookingStatus::AssignedToRoute,
                    BookingStatus::Collected,
                    BookingStatus::InSharpening,
                    BookingStatus::QualityChecked,
                    BookingStatus::Returned,
                    BookingStatus::Completed,
                    BookingStatus::ConvertedToOrder,
                ], true),
            ],
            [
                'step_key' => 'collection_scheduled',
                'label' => 'Collection scheduled',
                'description' => 'Your pickup date and time window are set.',
                'at' => static fn (): ?string => self::collectionScheduledDone($booking, $bs)
                    ? $booking->updated_at?->toIso8601String()
                    : null,
                'done' => static fn (): bool => self::collectionScheduledDone($booking, $bs),
            ],
            [
                'step_key' => 'driver_en_route',
                'label' => 'Driver on the way',
                'description' => 'Our driver is travelling to you.',
                'at' => static fn (): ?string => $st === RouteStopStatus::Travelling
                    ? $stop?->updated_at?->toIso8601String()
                    : null,
                'done' => static fn (): bool => $st === RouteStopStatus::Travelling && $routeLive,
            ],
            [
                'step_key' => 'collected',
                'label' => 'Collected · knives received',
                'description' => 'Knives have been collected from site.',
                'at' => static fn (): ?string => $stop?->departed_at?->toIso8601String(),
                'done' => static fn (): bool => $st !== null && in_array($st, [
                    RouteStopStatus::Collected,
                    RouteStopStatus::InSharpening,
                    RouteStopStatus::Returned,
                    RouteStopStatus::Completed,
                ], true) || self::bookingAtLeast($bs, BookingStatus::Collected),
            ],
            [
                'step_key' => 'workshop_intake',
                'label' => 'Received at our workshop',
                'description' => 'Your items are logged for sharpening.',
                'at' => static fn (): ?string => self::bookingAtLeast($bs, BookingStatus::InSharpening)
                    ? $booking->updated_at?->toIso8601String()
                    : null,
                'done' => static fn (): bool => self::bookingAtLeast($bs, BookingStatus::InSharpening),
            ],
            [
                'step_key' => 'sharpening',
                'label' => 'In sharpening',
                'description' => 'Our team is working through your batch.',
                'at' => static fn (): ?string => $order->order_status === OrderStatus::InProgress
                    ? $order->updated_at?->toIso8601String()
                    : null,
                'done' => static fn (): bool => self::orderSharpeningDone($order, $bs),
            ],
            [
                'step_key' => 'quality_checked',
                'label' => 'Quality checked',
                'description' => 'Your blades have passed our final quality check.',
                'at' => static fn (): ?string => self::qualityCheckedDone($order, $bs)
                    ? ($order->updated_at?->toIso8601String() ?? $booking->updated_at?->toIso8601String())
                    : null,
                'done' => static fn (): bool => self::qualityCheckedDone($order, $bs),
            ],
            [
                'step_key' => 'ready_for_return',
                'label' => 'Ready for return',
                'description' => 'Your items are packed for the journey back to you.',
                'at' => static fn (): ?string => self::readyForReturnDone($order, $stop, $bs)
                    ? ($order->completed_at?->toIso8601String() ?? $order->updated_at?->toIso8601String())
                    : null,
                'done' => static fn (): bool => self::readyForReturnDone($order, $stop, $bs),
            ],
            [
                'step_key' => 'returned',
                'label' => 'Returned / completed',
                'description' => 'Handover back at your site is complete.',
                'at' => static fn (): ?string => $stop?->return_completed_at?->toIso8601String(),
                'done' => static fn (): bool => $st !== null && in_array($st, [RouteStopStatus::Returned, RouteStopStatus::Completed], true)
                    || self::bookingAtLeast($bs, BookingStatus::Returned),
            ],
            [
                'step_key' => 'fulfilment_complete',
                'label' => 'Order complete',
                'description' => 'This order is closed out.',
                'at' => static fn (): ?string => $order->completed_at?->toIso8601String(),
                'done' => static fn (): bool => $order->order_status === OrderStatus::Completed,
            ],
        ];
    }

    /**
     * @param  \App\Models\RouteStop|null  $stop
     * @return list<array{step_key: string, label: string, description?: string, at?: \Closure(): ?string, done: \Closure(): bool}>
     */
    private static function bookingOnlyStepDefs(Booking $booking, $stop): array
    {
        $bs = $booking->booking_status;
        $st = $stop?->route_stop_status;
        $route = $booking->assignedRoute;
        $routeLive = $route !== null && $route->route_status === OperationalRouteStatus::InProgress;

        return [
            [
                'step_key' => 'booking_requested',
                'label' => 'Booking received',
                'description' => 'We have your collection request.',
                'at' => static fn (): ?string => $booking->created_at?->toIso8601String(),
                'done' => static fn (): bool => true,
            ],
            [
                'step_key' => 'booking_confirmed',
                'label' => 'Booking confirmed',
                'description' => 'Your appointment is locked in.',
                'at' => static fn (): ?string => ! in_array($bs, [BookingStatus::Requested], true)
                    ? $booking->updated_at?->toIso8601String()
                    : null,
                'done' => static fn (): bool => in_array($bs, [
                    BookingStatus::Confirmed,
                    BookingStatus::AssignedToRoute,
                    BookingStatus::Collected,
                    BookingStatus::InSharpening,
                    BookingStatus::QualityChecked,
                    BookingStatus::Returned,
                    BookingStatus::Completed,
                    BookingStatus::ConvertedToOrder,
                ], true),
            ],
            [
                'step_key' => 'collection_scheduled',
                'label' => 'Collection scheduled',
                'description' => 'Your pickup date and time window are set.',
                'at' => static fn (): ?string => self::collectionScheduledDone($booking, $bs)
                    ? $booking->updated_at?->toIso8601String()
                    : null,
                'done' => static fn (): bool => self::collectionScheduledDone($booking, $bs),
            ],
            [
                'step_key' => 'driver_en_route',
                'label' => 'Driver on the way',
                'description' => 'Our driver is travelling to you.',
                'at' => static fn (): ?string => $st === RouteStopStatus::Travelling
                    ? $stop?->updated_at?->toIso8601String()
                    : null,
                'done' => static fn (): bool => $st === RouteStopStatus::Travelling && $routeLive,
            ],
            [
                'step_key' => 'collected',
                'label' => 'Collected · knives received',
                'description' => 'Knives have been collected from site.',
                'at' => static fn (): ?string => $stop?->departed_at?->toIso8601String(),
                'done' => static fn (): bool => $st !== null && in_array($st, [
                    RouteStopStatus::Collected,
                    RouteStopStatus::InSharpening,
                    RouteStopStatus::Returned,
                    RouteStopStatus::Completed,
                ], true) || self::bookingAtLeast($bs, BookingStatus::Collected),
            ],
            [
                'step_key' => 'workshop_intake',
                'label' => 'Received at our workshop',
                'description' => 'Your items are logged for sharpening.',
                'at' => static fn (): ?string => self::bookingAtLeast($bs, BookingStatus::InSharpening)
                    ? $booking->updated_at?->toIso8601String()
                    : null,
                'done' => static fn (): bool => self::bookingAtLeast($bs, BookingStatus::InSharpening),
            ],
            [
                'step_key' => 'returned',
                'label' => 'Returned / completed',
                'description' => 'Handover back at your site is complete.',
                'at' => static fn (): ?string => $stop?->return_completed_at?->toIso8601String(),
                'done' => static fn (): bool => $st !== null && in_array($st, [RouteStopStatus::Returned, RouteStopStatus::Completed], true)
                    || self::bookingAtLeast($bs, BookingStatus::Returned),
            ],
            [
                'step_key' => 'booking_completed',
                'label' => 'Visit complete',
                'description' => 'This booking is closed out.',
                'at' => static fn (): ?string => $bs === BookingStatus::Completed
                    ? $booking->updated_at?->toIso8601String()
                    : null,
                'done' => static fn (): bool => $bs === BookingStatus::Completed,
            ],
        ];
    }

    /**
     * @return list<array{step_key: string, label: string, description?: string, at?: \Closure(): ?string, done: \Closure(): bool}>
     */
    private static function orderOnlyStepDefs(Order $order): array
    {
        return [
            [
                'step_key' => 'order_placed',
                'label' => 'Order placed',
                'description' => 'We are preparing this order.',
                'at' => static fn (): ?string => $order->created_at?->toIso8601String(),
                'done' => static fn (): bool => true,
            ],
            [
                'step_key' => 'sharpening',
                'label' => 'In sharpening',
                'description' => 'Our team is working through your batch.',
                'at' => static fn (): ?string => $order->order_status === OrderStatus::InProgress
                    ? $order->updated_at?->toIso8601String()
                    : null,
                'done' => static fn (): bool => self::orderSharpeningDoneOrderOnly($order),
            ],
            [
                'step_key' => 'quality_checked',
                'label' => 'Quality checked',
                'description' => 'Your blades have passed our final quality check.',
                'at' => static fn (): ?string => self::orderQualityCheckedDoneOrderOnly($order)
                    ? $order->updated_at?->toIso8601String()
                    : null,
                'done' => static fn (): bool => self::orderQualityCheckedDoneOrderOnly($order),
            ],
            [
                'step_key' => 'fulfilment_complete',
                'label' => 'Order complete',
                'description' => 'This order is closed out.',
                'at' => static fn (): ?string => $order->completed_at?->toIso8601String(),
                'done' => static fn (): bool => $order->order_status === OrderStatus::Completed,
            ],
        ];
    }

    /**
     * @param  list<array{step_key: string, label: string, description?: string, at?: string, state: string}>  $timeline
     * @return list<array{step_key: string, label: string, description?: string, at?: string, state: string}>
     */
    private static function appendInvoiceStep(array $timeline, Order $order): array
    {
        /** @var Invoice|null $inv */
        $inv = $order->invoices->first();
        if ($inv === null) {
            return $timeline;
        }

        $paid = in_array($order->payment_status, [OrderPaymentStatus::Paid, OrderPaymentStatus::Waived], true);

        $hasCurrent = false;
        foreach ($timeline as $step) {
            if (($step['state'] ?? '') === 'current') {
                $hasCurrent = true;
                break;
            }
        }

        if ($paid) {
            $invoiceState = 'complete';
        } elseif ($hasCurrent) {
            $invoiceState = 'upcoming';
        } else {
            $invoiceState = 'current';
        }

        $timeline[] = [
            'step_key' => 'invoice',
            'label' => 'Invoice',
            'description' => $paid ? 'Paid — thank you.' : 'Payment outstanding.',
            'at' => $inv->created_at?->toIso8601String(),
            'state' => $invoiceState,
        ];

        return $timeline;
    }

    /**
     * @param  list<array{step_key: string, label: string, description?: string, at?: \Closure(): ?string, done: \Closure(): bool}>  $defs
     * @return list<array{step_key: string, label: string, description?: string, at?: string, state: string}>
     */
    private static function resolveStates(array $defs): array
    {
        $out = [];
        $seenIncomplete = false;

        foreach ($defs as $def) {
            $ok = $def['done']();
            $atStr = $def['at'] !== null ? $def['at']() : null;
            if ($atStr instanceof CarbonInterface) {
                $atStr = $atStr->toIso8601String();
            }

            $row = [
                'step_key' => $def['step_key'],
                'label' => $def['label'],
                'state' => 'upcoming',
            ];
            if (isset($def['description'])) {
                $row['description'] = $def['description'];
            }
            if (is_string($atStr) && $atStr !== '') {
                $row['at'] = $atStr;
            }

            if ($ok) {
                $row['state'] = 'complete';
            } elseif (! $seenIncomplete) {
                $row['state'] = 'current';
                $seenIncomplete = true;
            }

            $out[] = $row;
        }

        return $out;
    }

    private static function orderSharpeningDone(Order $order, BookingStatus $bs): bool
    {
        if (self::bookingAtLeast($bs, BookingStatus::QualityChecked)) {
            return true;
        }

        return in_array($order->order_status, [
            OrderStatus::QualityCheck,
            OrderStatus::Completed,
            OrderStatus::Invoiced,
            OrderStatus::Returned,
        ], true);
    }

    private static function orderSharpeningDoneOrderOnly(Order $order): bool
    {
        return in_array($order->order_status, [
            OrderStatus::QualityCheck,
            OrderStatus::Completed,
            OrderStatus::Invoiced,
            OrderStatus::Returned,
        ], true);
    }

    private static function orderQualityCheckedDoneOrderOnly(Order $order): bool
    {
        return in_array($order->order_status, [
            OrderStatus::Completed,
            OrderStatus::Invoiced,
            OrderStatus::Returned,
        ], true);
    }

    private static function qualityCheckedDone(Order $order, BookingStatus $bs): bool
    {
        if (self::bookingAtLeast($bs, BookingStatus::QualityChecked)) {
            return true;
        }

        return in_array($order->order_status, [
            OrderStatus::Completed,
            OrderStatus::Invoiced,
            OrderStatus::Returned,
        ], true);
    }

    private static function readyForReturnDone(Order $order, $stop, BookingStatus $bs): bool
    {
        if (! in_array($order->order_status, [
            OrderStatus::Completed,
            OrderStatus::Invoiced,
            OrderStatus::Returned,
        ], true)) {
            return false;
        }

        if ($stop === null) {
            return true;
        }

        return ! in_array($stop->route_stop_status, [
            RouteStopStatus::Returned,
            RouteStopStatus::Completed,
        ], true);
    }

    private static function collectionScheduledDone(Booking $booking, BookingStatus $bs): bool
    {
        if ($booking->assigned_route_id !== null) {
            return true;
        }

        return in_array($bs, [
            BookingStatus::AssignedToRoute,
            BookingStatus::Collected,
            BookingStatus::InSharpening,
            BookingStatus::QualityChecked,
            BookingStatus::Returned,
            BookingStatus::Completed,
            BookingStatus::ConvertedToOrder,
        ], true)
            || (
                $booking->confirmed_collection_date !== null
                && ($booking->confirmed_time_window_start !== null || $booking->confirmed_time_window_end !== null)
            );
    }

    private static function orderInSharpeningOrLater(?OrderStatus $status): bool
    {
        if ($status === null) {
            return false;
        }

        return in_array($status, [
            OrderStatus::InProgress,
            OrderStatus::QualityCheck,
            OrderStatus::Completed,
            OrderStatus::Invoiced,
            OrderStatus::Returned,
        ], true);
    }

    private static function bookingAtLeast(BookingStatus $status, BookingStatus $min): bool
    {
        $rank = [
            BookingStatus::Requested->value => 0,
            BookingStatus::Confirmed->value => 1,
            BookingStatus::AssignedToRoute->value => 2,
            BookingStatus::ConvertedToOrder->value => 2,
            BookingStatus::Collected->value => 3,
            BookingStatus::InSharpening->value => 4,
            BookingStatus::QualityChecked->value => 5,
            BookingStatus::Returned->value => 6,
            BookingStatus::Completed->value => 7,
            BookingStatus::NoShow->value => -1,
            BookingStatus::Cancelled->value => -1,
        ];

        $a = $rank[$status->value] ?? -1;
        $b = $rank[$min->value] ?? 0;

        return $a >= $b && $a >= 0;
    }

    /**
     * @param  \App\Models\RouteStop|null  $stop
     */
    private static function routeSummary(?Booking $booking, $stop): ?array
    {
        if ($booking === null) {
            return null;
        }

        $date = ($booking->confirmed_collection_date ?? $booking->requested_collection_date ?? $booking->scheduled_date)?->format('Y-m-d');

        return [
            'collection_date' => $date,
            'collection_window_start' => self::formatTimeSlot($booking->confirmed_time_window_start ?? $booking->requested_time_window_start ?? $booking->time_window_start),
            'collection_window_end' => self::formatTimeSlot($booking->confirmed_time_window_end ?? $booking->requested_time_window_end ?? $booking->time_window_end),
            'collected_at' => $stop?->departed_at?->toIso8601String(),
            'returned_at' => $stop?->return_completed_at?->toIso8601String(),
        ];
    }

    private static function formatTimeSlot(mixed $v): ?string
    {
        if ($v === null) {
            return null;
        }

        if ($v instanceof CarbonInterface) {
            return $v->format('H:i');
        }

        return is_string($v) ? $v : null;
    }

    /**
     * @return list<array{step_key: string, label: string, description?: string, at?: string, state: string}>
     */
    private static function terminalTimeline(string $key, string $label, string $description): array
    {
        return [
            [
                'step_key' => $key,
                'label' => $label,
                'description' => $description,
                'state' => 'current',
            ],
        ];
    }
}

