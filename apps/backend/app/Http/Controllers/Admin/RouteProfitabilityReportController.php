<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminReportRequest;
use App\Services\Finance\RouteProfitabilityReportService;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;

final class RouteProfitabilityReportController extends Controller
{
    public function __invoke(AdminReportRequest $request, RouteProfitabilityReportService $service): JsonResponse
    {
        return ApiResponses::success($service->build($request->filters()));
    }
}
