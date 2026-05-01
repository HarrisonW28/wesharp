<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminReportRequest;
use App\Services\Reports\ReportingService;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;

final class ReportingController extends Controller
{
    public function __construct(
        private readonly ReportingService $reporting,
    ) {}

    public function sales(AdminReportRequest $request): JsonResponse
    {
        return ApiResponses::success($this->reporting->sales($request->filters()));
    }

    public function invoices(AdminReportRequest $request): JsonResponse
    {
        return ApiResponses::success($this->reporting->invoices($request->filters()));
    }

    public function subscriptions(AdminReportRequest $request): JsonResponse
    {
        return ApiResponses::success($this->reporting->subscriptions($request->filters()));
    }

    public function exportPlaceholder(): JsonResponse
    {
        return ApiResponses::success($this->reporting->exportPlaceholder());
    }

    public function bookings(AdminReportRequest $request): JsonResponse
    {
        return ApiResponses::success($this->reporting->bookings($request->filters()));
    }

    public function orders(AdminReportRequest $request): JsonResponse
    {
        return ApiResponses::success($this->reporting->orders($request->filters()));
    }

    public function routes(AdminReportRequest $request): JsonResponse
    {
        return ApiResponses::success($this->reporting->routes($request->filters()));
    }

    public function knives(AdminReportRequest $request): JsonResponse
    {
        return ApiResponses::success($this->reporting->knives($request->filters()));
    }

    public function billing(AdminReportRequest $request): JsonResponse
    {
        return ApiResponses::success($this->reporting->billing($request->filters()));
    }
}
