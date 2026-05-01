<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\FinanceDashboardRequest;
use App\Services\Finance\FinanceDashboardService;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;

final class FinanceDashboardController extends Controller
{
    public function __invoke(FinanceDashboardRequest $request, FinanceDashboardService $service): JsonResponse
    {
        return ApiResponses::success($service->build($request));
    }
}
