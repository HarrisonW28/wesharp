<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicSubscriptionPlanResource;
use App\Services\SiteContent\SiteContentService;
use App\Support\ApiResponses;
use App\Support\Subscriptions\PublicSubscriptionPlanCatalog;
use Illuminate\Http\JsonResponse;

final class PublicSiteContentController extends Controller
{
    public function show(SiteContentService $content): JsonResponse
    {
        $plans = PublicSubscriptionPlanCatalog::marketedPlans();

        return ApiResponses::success([
            'content' => $content->resolved(),
            'public_subscription_plans' => PublicSubscriptionPlanResource::collection($plans),
            'public_booking' => [
                'offer_subscription_checkout_in_wizard' => (bool) config('public_booking.offer_subscription_checkout_in_wizard'),
            ],
        ]);
    }
}
