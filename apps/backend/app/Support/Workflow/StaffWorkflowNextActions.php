<?php

declare(strict_types=1);

namespace App\Support\Workflow;

use App\Enums\BookingStatus;
use App\Enums\InvoiceStatus;
use App\Enums\OrderPaymentStatus;
use App\Enums\OrderStatus;
use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Order;

final class StaffWorkflowNextActions
{
    /** @return list<string> */
    public static function forBooking(Booking $b): array
    {
        $b->loadMissing(['orders']);

        $status = $b->booking_status;

        if (in_array($status, [BookingStatus::Cancelled, BookingStatus::NoShow], true)) {
            return ['This booking is cancelled or marked no-show — no further collection workflow.'];
        }

        $actions = [];

        if ($status === BookingStatus::Requested) {
            $actions[] = 'Confirm the booking and agree the collection date or window with the customer.';
        }

        if ($status === BookingStatus::Confirmed && $b->assigned_route_id === null) {
            $actions[] = 'Assign this booking to a route that matches the collection date.';
        }

        if ($status === BookingStatus::AssignedToRoute) {
            $actions[] = 'Complete collection on the route (or mark failed), then convert to an order when ready.';
        }

        if ($status === BookingStatus::Collected) {
            $actions[] = 'Convert this booking to an order to start workshop work and billing.';
        }

        if ($b->orders->isNotEmpty()) {
            $actions[] = 'Open the linked order to add blades, pricing, and invoicing.';
        }

        if ($status === BookingStatus::ConvertedToOrder && $b->orders->isEmpty()) {
            $actions[] = 'This booking shows as converted but has no linked order — contact support if that is unexpected.';
        }

        return array_values(array_unique($actions));
    }

    private static function orderUsesSubscriptionInvoiceLines(Order $order): bool
    {
        $coverage = $order->subscription_coverage;

        return is_array($coverage)
            && ($coverage['mode'] ?? '') === 'subscription'
            && $order->company_subscription_id !== null;
    }

    private static function firstActiveInvoice(Order $order): ?Invoice
    {
        if (! $order->relationLoaded('invoices')) {
            return null;
        }

        foreach ($order->invoices as $inv) {
            if ($inv->invoice_status !== InvoiceStatus::Void) {
                return $inv;
            }
        }

        return null;
    }

    /** @return list<string> */
    public static function forOrder(Order $order): array
    {
        $order->loadMissing(['items', 'knives', 'invoices', 'booking']);

        if ($order->order_status === OrderStatus::Cancelled) {
            return ['This order is cancelled.'];
        }

        $actions = [];

        $knifeCount = $order->relationLoaded('knives')
            ? $order->knives->count()
            : (int) $order->knife_count;
        $itemCount = $order->relationLoaded('items')
            ? $order->items->count()
            : $order->items()->count();

        $postBillableMilestone = in_array($order->order_status, [
            OrderStatus::Completed,
            OrderStatus::Returned,
            OrderStatus::Invoiced,
        ], true);

        if (! $postBillableMilestone && $knifeCount === 0 && $itemCount === 0) {
            $actions[] = 'Add knives or workshop line items before you can invoice or complete this order.';
        }

        $useSub = self::orderUsesSubscriptionInvoiceLines($order);
        $complimentary = (bool) $order->is_complimentary;
        $total = (int) $order->total_pence;

        if (! $postBillableMilestone && ! $useSub && ! $complimentary && $total <= 0) {
            $actions[] = 'Set pricing: per-blade rate, order lines, a manual charge, or mark the order complimentary before creating an invoice.';
        }

        $activeInvoice = self::firstActiveInvoice($order);

        if ($activeInvoice === null
            && ! $postBillableMilestone
            && ($knifeCount > 0 || $itemCount > 0)
            && ($useSub || $complimentary || $total > 0)
            && in_array($order->order_status, [
                OrderStatus::QualityCheck,
                OrderStatus::Completed,
            ], true)
        ) {
            $actions[] = 'Generate a draft invoice when work is ready to bill.';
        }

        if ($activeInvoice !== null) {
            $st = $activeInvoice->invoice_status;
            if (in_array($st, [InvoiceStatus::Draft, InvoiceStatus::Sent, InvoiceStatus::Overdue], true)) {
                $actions[] = 'Issue or record payment on the invoice when the customer pays.';
            }
        }

        if ($order->payment_status === OrderPaymentStatus::Paid
            && ! in_array($order->order_status, [
                OrderStatus::Completed,
                OrderStatus::Returned,
                OrderStatus::Cancelled,
            ], true)
        ) {
            $actions[] = 'Complete the order (or process returns) once fulfilment is finished.';
        }

        return array_values(array_unique($actions));
    }
}
