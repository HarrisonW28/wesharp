<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SalesPosPerformanceReportRequest;
use App\Models\User;
use App\Services\Finance\SalesPosPerformanceReportService;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;

final class SalesPosPerformanceReportController extends Controller
{
    public function __invoke(SalesPosPerformanceReportRequest $request, SalesPosPerformanceReportService $service): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            abort(403);
        }

        return ApiResponses::success($service->build($request, $user));
    }
}
