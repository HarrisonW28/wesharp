<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SubscriptionProfitabilityReportRequest;
use App\Services\Finance\SubscriptionProfitabilityReportService;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;

final class SubscriptionProfitabilityReportController extends Controller
{
    public function __invoke(SubscriptionProfitabilityReportRequest $request, SubscriptionProfitabilityReportService $service): JsonResponse
    {
        return ApiResponses::success($service->build($request));
    }
}
