<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpsertSubscriptionPlanRequest;
use App\Http\Resources\SubscriptionPlanResource;
use App\Models\SubscriptionPlan;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class SubscriptionPlanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SubscriptionPlan::class);

        $plans = SubscriptionPlan::query()
            ->orderByDesc('is_active')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return ApiResponses::success([
            'items' => SubscriptionPlanResource::collection($plans),
        ]);
    }

    public function store(UpsertSubscriptionPlanRequest $request): JsonResponse
    {
        $this->authorize('create', SubscriptionPlan::class);

        $plan = SubscriptionPlan::query()->create($request->planPayload());

        AuditRecorder::record($request->user(), $plan, 'subscription_plan.created', [
            'plan_id' => (string) $plan->id,
            'name' => $plan->name,
            'billing_interval' => $plan->billing_interval?->value,
            'price_amount_minor' => (int) $plan->price_amount_minor,
            'currency' => (string) $plan->currency,
            'is_active' => (bool) $plan->is_active,
        ], $request);

        return ApiResponses::success([
            'plan' => SubscriptionPlanResource::make($plan),
        ], 201);
    }

    public function update(UpsertSubscriptionPlanRequest $request, SubscriptionPlan $plan): JsonResponse
    {
        $this->authorize('update', $plan);

        $before = [
            'name' => $plan->name,
            'billing_interval' => $plan->billing_interval?->value,
            'price_amount_minor' => (int) $plan->price_amount_minor,
            'currency' => (string) $plan->currency,
            'included_collections' => $plan->included_collections,
            'included_knife_allowance' => $plan->included_knife_allowance,
            'overage_price_amount_minor' => $plan->overage_price_amount_minor,
            'is_active' => (bool) $plan->is_active,
            'sort_order' => (int) $plan->sort_order,
        ];

        $plan->fill($request->planPayload());
        $plan->save();

        $after = [
            'name' => $plan->name,
            'billing_interval' => $plan->billing_interval?->value,
            'price_amount_minor' => (int) $plan->price_amount_minor,
            'currency' => (string) $plan->currency,
            'included_collections' => $plan->included_collections,
            'included_knife_allowance' => $plan->included_knife_allowance,
            'overage_price_amount_minor' => $plan->overage_price_amount_minor,
            'is_active' => (bool) $plan->is_active,
            'sort_order' => (int) $plan->sort_order,
        ];

        AuditRecorder::record($request->user(), $plan, 'subscription_plan.updated', [
            'plan_id' => (string) $plan->id,
            'before' => $before,
            'after' => $after,
        ], $request);

        return ApiResponses::success([
            'plan' => SubscriptionPlanResource::make($plan),
        ]);
    }

    public function deactivate(Request $request, SubscriptionPlan $plan): JsonResponse
    {
        $this->authorize('update', $plan);

        $plan->forceFill(['is_active' => false])->save();

        AuditRecorder::record($request->user(), $plan, 'subscription_plan.deactivated', [
            'plan_id' => (string) $plan->id,
            'name' => $plan->name,
        ], $request);

        return ApiResponses::success([
            'plan' => SubscriptionPlanResource::make($plan),
        ]);
    }

    public function activate(Request $request, SubscriptionPlan $plan): JsonResponse
    {
        $this->authorize('update', $plan);

        $plan->forceFill(['is_active' => true])->save();

        AuditRecorder::record($request->user(), $plan, 'subscription_plan.activated', [
            'plan_id' => (string) $plan->id,
            'name' => $plan->name,
        ], $request);

        return ApiResponses::success([
            'plan' => SubscriptionPlanResource::make($plan),
        ]);
    }

    public function archive(Request $request, SubscriptionPlan $plan): JsonResponse
    {
        $this->authorize('delete', $plan);

        $plan->delete();

        AuditRecorder::record($request->user(), $plan, 'subscription_plan.archived', [
            'plan_id' => (string) $plan->id,
            'name' => $plan->name,
        ], $request);

        return ApiResponses::success([
            'archived' => true,
        ]);
    }
}
