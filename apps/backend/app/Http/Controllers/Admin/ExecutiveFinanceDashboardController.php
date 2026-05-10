<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ExecutiveFinanceDashboardRequest;
use App\Services\Finance\ExecutiveFinanceDashboardService;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;

final class ExecutiveFinanceDashboardController extends Controller
{
    public function __invoke(ExecutiveFinanceDashboardRequest $request, ExecutiveFinanceDashboardService $service): JsonResponse
    {
        return ApiResponses::success($service->build($request));
    }
}
