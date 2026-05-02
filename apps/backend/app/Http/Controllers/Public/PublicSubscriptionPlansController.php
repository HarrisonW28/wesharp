<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicSubscriptionPlanResource;
use App\Support\ApiResponses;
use App\Support\Subscriptions\PublicSubscriptionPlanCatalog;
use Illuminate\Http\JsonResponse;

final class PublicSubscriptionPlansController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = PublicSubscriptionPlanCatalog::marketedPlans();

        return ApiResponses::success([
            'items' => PublicSubscriptionPlanResource::collection($plans),
        ]);
    }
}
