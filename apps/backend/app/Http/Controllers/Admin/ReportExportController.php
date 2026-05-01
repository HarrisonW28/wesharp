<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminReportRequest;
use App\Services\Reports\ReportExportService;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class ReportExportController extends Controller
{
    public function __construct(
        private readonly ReportExportService $exports,
    ) {}

    public function salesInvoices(AdminReportRequest $request): StreamedResponse
    {
        return $this->exports->salesInvoicesCsv($request->filters());
    }

    public function invoicesOutstanding(AdminReportRequest $request): StreamedResponse
    {
        return $this->exports->invoicesOutstandingCsv($request->filters());
    }

    public function payments(AdminReportRequest $request): StreamedResponse
    {
        return $this->exports->paymentsCsv($request->filters());
    }

    public function subscriptions(AdminReportRequest $request): StreamedResponse
    {
        return $this->exports->subscriptionsCsv($request->filters());
    }

    public function bookings(AdminReportRequest $request): StreamedResponse
    {
        return $this->exports->bookingsCsv($request->filters());
    }

    public function orders(AdminReportRequest $request): StreamedResponse
    {
        return $this->exports->ordersCsv($request->filters());
    }

    public function routes(AdminReportRequest $request): StreamedResponse
    {
        return $this->exports->routesCsv($request->filters());
    }

    public function knives(AdminReportRequest $request): StreamedResponse
    {
        return $this->exports->knivesCsv($request->filters());
    }
}
