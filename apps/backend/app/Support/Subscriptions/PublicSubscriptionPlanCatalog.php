<?php

declare(strict_types=1);

namespace App\Support\Subscriptions;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\Schema;

/**
 * Active plans surfaced on marketing (public subscription cards, site-content, pricing estimate).
 */
final class PublicSubscriptionPlanCatalog
{
    /** @return EloquentCollection<int, SubscriptionPlan> */
    public static function marketedPlans(): EloquentCollection
    {
        if (! Schema::hasColumn('subscription_plans', 'show_on_public_site')) {
            /** @var EloquentCollection<int, SubscriptionPlan> $empty */
            $empty = SubscriptionPlan::query()->whereRaw('1 = 0')->get();

            return $empty;
        }

        /** @var EloquentCollection<int, SubscriptionPlan> $plans */
        $plans = SubscriptionPlan::query()
            ->where('is_active', true)
            ->where('show_on_public_site', true)
            ->whereNull('deleted_at')
            ->orderByDesc('recommended')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return $plans;
    }
}
