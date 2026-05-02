<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StorePublicPricingEstimateRequest;
use App\Services\Pricing\PublicPricingEstimateService;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;

final class PublicPricingEstimateController extends Controller
{
    public function store(StorePublicPricingEstimateRequest $request, PublicPricingEstimateService $estimator): JsonResponse
    {
        $payload = $estimator->estimate($request->estimatePayload());

        return ApiResponses::success($payload);
    }
}
