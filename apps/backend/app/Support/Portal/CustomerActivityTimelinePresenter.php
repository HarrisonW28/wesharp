<?php

declare(strict_types=1);

namespace App\Support\Portal;

use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\CompanySubscription;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payment;
use App\Support\Audit\AuditActionLabels;
use Illuminate\Support\Collection;

/**
 * Customer-safe activity rows: timestamp + label only (no actor IDs, payloads, IPs, or request metadata).
 */
final class CustomerActivityTimelinePresenter
{
    /** @var list<string> */
    private const BOOKING_ACTIONS = [
        'booking.created',
        'booking.created_from_public_enquiry',
        'booking.customer_portal_requested',
        'booking.confirmed',
        'booking.cancelled',
        'booking.requested_window_changed',
        'booking.confirmed_window_changed',
        'booking.assigned_route',
        'booking.route_unassigned',
        'booking.converted_to_order',
        'booking.synced_from_route_stop',
        'booking.fields_updated',
    ];

    /** @var list<string> */
    private const ORDER_ACTIONS = [
        'order.created',
        'order.created_from_booking',
        'order.status_changed',
        'order.completed',
        'order.cancelled',
        'order.activated',
    ];

    /** @var list<string> */
    private const INVOICE_ACTIONS = [
        'invoice.sent',
        'invoice.created_from_order',
        'invoice.marked_paid',
        'invoice.auto_overdue',
        'invoice.draft_generated',
    ];

    /** @var list<string> */
    private const PAYMENT_ACTIONS = [
        'payment.recorded.manual',
    ];

    /** @var list<string> */
    private const SUBSCRIPTION_ACTIONS = [
        'company_subscription.assigned',
        'company_subscription.cancelled',
        'company_subscription.plan_changed',
        'company_subscription.reactivated',
        'company_subscription.billing_contact_changed',
        'company_subscription.billing_period_renewed',
    ];

    /**
     * @return list<array{at: string|null, label: string}>
     */
    public static function forBooking(Booking $booking, int $limit = 100): array
    {
        $rows = AuditLog::query()
            ->where('auditable_type', Booking::class)
            ->where('auditable_id', $booking->id)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        return self::presentRows($rows, self::BOOKING_ACTIONS);
    }

    /**
     * @return list<array{at: string|null, label: string}>
     */
    public static function forOrder(Order $order, int $limit = 120): array
    {
        $chunks = [];

        $orderRows = AuditLog::query()
            ->where('auditable_type', Order::class)
            ->where('auditable_id', $order->id)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
        $chunks = array_merge($chunks, self::presentRows($orderRows, self::ORDER_ACTIONS));

        $invoiceIds = Invoice::query()
            ->where('order_id', $order->id)
            ->pluck('id')
            ->all();
        if ($invoiceIds !== []) {
            $invRows = AuditLog::query()
                ->where('auditable_type', Invoice::class)
                ->whereIn('auditable_id', $invoiceIds)
                ->orderByDesc('created_at')
                ->limit($limit)
                ->get();
            $chunks = array_merge($chunks, self::presentRows($invRows, self::INVOICE_ACTIONS));
        }

        $paymentIds = Payment::query()
            ->where('order_id', $order->id)
            ->pluck('id')
            ->all();
        if ($paymentIds !== []) {
            $payRows = AuditLog::query()
                ->where('auditable_type', Payment::class)
                ->whereIn('auditable_id', $paymentIds)
                ->orderByDesc('created_at')
                ->limit($limit)
                ->get();
            $chunks = array_merge($chunks, self::presentRows($payRows, self::PAYMENT_ACTIONS));
        }

        return self::mergeSortSlice($chunks, $limit);
    }

    /**
     * @return list<array{at: string|null, label: string}>
     */
    public static function forCompanySubscription(CompanySubscription $subscription, int $limit = 100): array
    {
        $rows = AuditLog::query()
            ->where('auditable_type', CompanySubscription::class)
            ->where('auditable_id', $subscription->id)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        return self::presentRows($rows, self::SUBSCRIPTION_ACTIONS);
    }

    /**
     * @param  Collection<int, AuditLog>  $rows
     * @param  list<string>  $allowlist
     * @return list<array{at: string|null, label: string}>
     */
    private static function presentRows(Collection $rows, array $allowlist): array
    {
        $allow = array_flip($allowlist);
        $out = [];
        foreach ($rows as $row) {
            if (! isset($allow[$row->action])) {
                continue;
            }
            $out[] = [
                'at' => $row->created_at?->toIso8601String(),
                'label' => AuditActionLabels::label((string) $row->action),
            ];
        }

        return $out;
    }

    /**
     * @param  list<array{at: string|null, label: string}>  $entries
     * @return list<array{at: string|null, label: string}>
     */
    private static function mergeSortSlice(array $entries, int $limit): array
    {
        usort(
            $entries,
            static fn (array $a, array $b): int => strcmp((string) ($b['at'] ?? ''), (string) ($a['at'] ?? '')),
        );

        if (count($entries) <= $limit) {
            return $entries;
        }

        return array_slice($entries, 0, $limit);
    }
}
