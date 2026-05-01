<?php

declare(strict_types=1);

namespace App\Data\Reports;

use Carbon\CarbonInterface;

/**
 * Normalised filter set for admin reporting endpoints (query params).
 */
final readonly class AdminReportFilters
{
    /**
     * @param  non-empty-string|null  $bookingStatus  Raw enum value or null
     * @param  non-empty-string|null  $orderStatus
     * @param  non-empty-string|null  $invoiceStatus
     * @param  non-empty-string|null  $paymentStatus  Payment row status filter (payments.payment_status)
     * @param  non-empty-string|null  $routeStatus
     * @param  non-empty-string|null  $knifeStatus  Raw `knife_status` enum value
     * @param  non-empty-string|null  $knifeType  Exact `knives.knife_type` match
     * @param  non-empty-string|null  $serviceType  Booking `service_type` (collection / onsite)
     */
    public function __construct(
        public CarbonInterface $from,
        public CarbonInterface $to,
        public ?string $city,
        /** Coverage area for route reports (alias for coverage_city). */
        public ?string $area,
        public ?string $companyId,
        public ?string $bookingStatus,
        public ?string $orderStatus,
        public ?string $invoiceStatus,
        public ?string $paymentStatus,
        public ?string $routeStatus,
        /** Filter route reports to routes that have a skipped stop with this failure_reason. */
        public ?string $failureReason,
        public ?string $knifeStatus,
        public ?string $knifeType,
        public ?string $serviceType,
        public ?string $routeId,
        public ?int $driverUserId,
        public int $perPage,
        public int $page,
        /** When set, overrides `page` for the bookings report detail table only. */
        public ?int $bookingsPage = null,
        /** When set, overrides `page` for the orders report detail table only. */
        public ?int $ordersPage = null,
        /** Billing report: filter payments by `payments.payment_method`. */
        public ?string $paymentMethod = null,
        /**
         * Billing report AR snapshot filter: current | 1_30 | 31_60 | 61_90 | 90_plus
         */
        public ?string $arAgeBucket = null,
        /** Billing report: unpaid invoices table page override. */
        public ?int $unpaidPage = null,
        /** Billing report: overdue invoices table page override. */
        public ?int $overduePage = null,
        /** Subscription reporting: filter `company_subscriptions.subscription_plan_id`. */
        public ?string $subscriptionPlanId = null,
        /** Subscription reporting: filter `company_subscriptions.status` value. */
        public ?string $subscriptionStatus = null,
    ) {}

    /**
     * @return array<string, scalar|null>
     */
    public function toArray(): array
    {
        return [
            'date_from' => $this->from->copy()->utc()->startOfDay()->toDateString(),
            'date_to' => $this->to->copy()->utc()->startOfDay()->toDateString(),
            'city' => $this->city,
            'area' => $this->area,
            'company_id' => $this->companyId,
            'booking_status' => $this->bookingStatus,
            'order_status' => $this->orderStatus,
            'invoice_status' => $this->invoiceStatus,
            'payment_status' => $this->paymentStatus,
            'route_status' => $this->routeStatus,
            'failure_reason' => $this->failureReason,
            'knife_status' => $this->knifeStatus,
            'knife_type' => $this->knifeType,
            'service_type' => $this->serviceType,
            'route_id' => $this->routeId,
            'driver_user_id' => $this->driverUserId,
            'bookings_page' => $this->bookingsPage,
            'orders_page' => $this->ordersPage,
            'payment_method' => $this->paymentMethod,
            'ar_age_bucket' => $this->arAgeBucket,
            'unpaid_page' => $this->unpaidPage,
            'overdue_page' => $this->overduePage,
            'subscription_plan_id' => $this->subscriptionPlanId,
            'subscription_status' => $this->subscriptionStatus,
        ];
    }
}
