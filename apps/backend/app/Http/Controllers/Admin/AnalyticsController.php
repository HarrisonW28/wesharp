<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\AnalyticsDashboardRequest;
use App\Services\Analytics\AnalyticsService;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;

final class AnalyticsController extends Controller
{
    public function __construct(
        private readonly AnalyticsService $analyticsService,
    ) {}

    public function overview(AnalyticsDashboardRequest $request): JsonResponse
    {
        [$from, $to] = $request->reportingRangeInclusive();

        return ApiResponses::success($this->analyticsService->overview(
            /** @phpstan-ignore-next-line */
            $request->validatedCity(),
            $from,
            $to,
        ));
    }

    public function sales(AnalyticsDashboardRequest $request): JsonResponse
    {
        [$from, $to] = $request->reportingRangeInclusive();

        return ApiResponses::success($this->analyticsService->sales(
            /** @phpstan-ignore-next-line */
            $request->validatedCity(),
            $from,
            $to,
        ));
    }

    public function routes(AnalyticsDashboardRequest $request): JsonResponse
    {
        [$from, $to] = $request->reportingRangeInclusive();

        return ApiResponses::success($this->analyticsService->routes(
            /** @phpstan-ignore-next-line */
            $request->validatedCity(),
            $from,
            $to,
        ));
    }

    public function operations(AnalyticsDashboardRequest $request): JsonResponse
    {
        [$from, $to] = $request->reportingRangeInclusive();

        return ApiResponses::success($this->analyticsService->operations(
            /** @phpstan-ignore-next-line */
            $request->validatedCity(),
            $from,
            $to,
        ));
    }
}
