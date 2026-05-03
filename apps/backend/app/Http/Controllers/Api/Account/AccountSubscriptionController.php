<?php

namespace App\Http\Controllers\Api\Account;

use App\Actions\Subscriptions\CreateStripeSubscriptionCheckoutSessionAction;
use App\Models\SubscriptionPlan;
use App\Support\Account\CustomerSubscriptionPayload;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AccountSubscriptionController extends TenantAccountController
{
    public function show(Request $request): JsonResponse
    {
        $company = $this->tenantCompany($request);

        /** @phpstan-ignore-next-line */
        $this->authorize('view', $company);

        /** @phpstan-ignore-next-line */
        $companyId = (string) $company->id;

        return ApiResponses::success([
            'subscription' => CustomerSubscriptionPayload::forCompany($companyId),
        ]);
    }

    public function stripeCheckoutSession(Request $request, CreateStripeSubscriptionCheckoutSessionAction $action): JsonResponse
    {
        $company = $this->tenantCompany($request);
        $this->authorize('view', $company);

        /** @var array{subscription_plan_id: string} $validated */
        $validated = $request->validate([
            'subscription_plan_id' => ['required', 'uuid', 'exists:subscription_plans,id'],
        ]);

        $plan = SubscriptionPlan::query()->findOrFail($validated['subscription_plan_id']);
        $this->authorize('subscribeHosted', $plan);

        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        return ApiResponses::success($action->execute($company, $plan, $user)->toArray());
    }
}
