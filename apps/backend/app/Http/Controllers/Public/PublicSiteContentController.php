<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicSubscriptionPlanResource;
use App\Models\SubscriptionPlan;
use App\Services\SiteContent\SiteContentService;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Schema;

final class PublicSiteContentController extends Controller
{
    public function show(SiteContentService $content): JsonResponse
    {
        $plans = collect();
        if (Schema::hasColumn('subscription_plans', 'show_on_public_site')) {
            $plans = SubscriptionPlan::query()
                ->where('is_active', true)
                ->where('show_on_public_site', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get();
        }

        return ApiResponses::success([
            'content' => $content->resolved(),
            'public_subscription_plans' => PublicSubscriptionPlanResource::collection($plans),
        ]);
    }
}
