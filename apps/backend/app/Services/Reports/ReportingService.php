<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Data\Reports\AdminReportFilters;
use App\Support\Reports\ReportEnvelope;

/**
 * Thin facade for tests and future composite dashboards; delegates to domain services.
 */
final class ReportingService
{
    public function __construct(
        private readonly SalesReportService $salesReportService,
        private readonly InvoiceReportService $invoiceReportService,
        private readonly SubscriptionReportService $subscriptionReportService,
        private readonly BookingReportService $bookingReportService,
        private readonly OrderReportService $orderReportService,
        private readonly RouteReportService $routeReportService,
        private readonly KnifeReportService $knifeReportService,
        private readonly BillingReportService $billingReportService,
        private readonly RecurringRevenueReportService $recurringRevenueReportService,
    ) {}

    /** @return array<string, mixed> */
    public function sales(AdminReportFilters $f): array
    {
        return $this->salesReportService->build($f);
    }

    /** @return array<string, mixed> */
    public function invoices(AdminReportFilters $f): array
    {
        return $this->invoiceReportService->build($f);
    }

    /** @return array<string, mixed> */
    public function subscriptions(AdminReportFilters $f): array
    {
        return $this->subscriptionReportService->build($f);
    }

    /** @return array<string, mixed> */
    public function bookings(AdminReportFilters $f): array
    {
        return $this->bookingReportService->build($f);
    }

    /** @return array<string, mixed> */
    public function orders(AdminReportFilters $f): array
    {
        return $this->orderReportService->build($f);
    }

    /** @return array<string, mixed> */
    public function routes(AdminReportFilters $f): array
    {
        return $this->routeReportService->build($f);
    }

    /** @return array<string, mixed> */
    public function knives(AdminReportFilters $f): array
    {
        return $this->knifeReportService->build($f);
    }

    /** @return array<string, mixed> */
    public function billing(AdminReportFilters $f): array
    {
        return $this->billingReportService->build($f);
    }

    /** @return array<string, mixed> */
    public function recurringRevenue(AdminReportFilters $f): array
    {
        return $this->recurringRevenueReportService->build($f);
    }

    /** @return array<string, mixed> */
    public function exportPlaceholder(): array
    {
        return ReportEnvelope::make(
            'export',
            [],
            [],
            null,
            null,
            [],
            [
                'available' => true,
                'formats' => ['csv'],
                'message' => 'Use GET /api/admin/reports/exports/*.csv with the same query params as JSON reports (UTF-8, Excel-friendly).',
            ],
        );
    }
}
