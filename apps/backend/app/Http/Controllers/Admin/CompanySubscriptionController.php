<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\Invoices\GenerateSubscriptionInvoiceAction;
use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AssignCompanySubscriptionRequest;
use App\Http\Requests\Admin\CancelCompanySubscriptionRequest;
use App\Http\Requests\Admin\ChangeCompanySubscriptionPlanRequest;
use App\Http\Requests\Admin\GenerateSubscriptionInvoiceDraftRequest;
use App\Http\Requests\Admin\ReactivateCompanySubscriptionRequest;
use App\Http\Requests\Admin\UpdateCompanySubscriptionBillingContactRequest;
use App\Http\Resources\CompanySubscriptionResource;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\Invoice;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use App\Services\Subscriptions\CompanySubscriptionProvisioningService;
use App\Services\Subscriptions\OrderSubscriptionCoverageService;
use App\Support\ApiResponses;
use App\Support\Invoices\InvoiceJson;
use App\Support\Permissions;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class CompanySubscriptionController extends Controller
{
    public function __construct(
        private readonly CompanySubscriptionProvisioningService $provisioning,
    ) {}

    public function index(Request $request, Company $company): JsonResponse
    {
        $this->authorize('view', $company);

        $user = $request->user();
        \assert($user instanceof User);

        if (! Permissions::userMay($user, Permissions::SUBSCRIPTIONS_VIEW)) {
            abort(403);
        }

        $items = $company->subscriptions()
            ->with(['plan', 'billingContact'])
            ->limit(100)
            ->get();

        return ApiResponses::success([
            'items' => CompanySubscriptionResource::collection($items),
        ]);
    }

    public function store(AssignCompanySubscriptionRequest $request, Company $company): JsonResponse
    {
        $this->authorize('create', CompanySubscription::class);
        $this->authorize('view', $company);

        $v = $request->validated();
        $plan = SubscriptionPlan::query()->findOrFail((string) $v['subscription_plan_id']);

        $allowInactive = (bool) ($v['allow_inactive_plan'] ?? false);

        $sub = $this->provisioning->assignActive(
            $company,
            $plan,
            CarbonImmutable::parse((string) $v['starts_at']),
            isset($v['renews_at']) && $v['renews_at'] !== null
                ? CarbonImmutable::parse((string) $v['renews_at'])
                : null,
            isset($v['billing_contact_id']) ? (string) $v['billing_contact_id'] : null,
            isset($v['price_amount_minor_snapshot']) ? (int) $v['price_amount_minor_snapshot'] : null,
            isset($v['notes']) ? (string) $v['notes'] : null,
            $allowInactive,
        );

        $sub->load('plan');

        AuditRecorder::record($request->user(), $sub, 'company_subscription.assigned', [
            'company_id' => (string) $company->id,
            'subscription_plan_id' => (string) $plan->id,
            'plan_name' => $plan->name,
            'starts_at' => $sub->starts_at?->toDateString(),
            'renews_at' => $sub->renews_at?->toDateString(),
            'price_amount_minor_snapshot' => (int) $sub->price_amount_minor_snapshot,
        ], $request);

        return ApiResponses::success([
            'subscription' => CompanySubscriptionResource::make($sub),
        ], 201);
    }

    public function changePlan(ChangeCompanySubscriptionPlanRequest $request, Company $company): JsonResponse
    {
        $this->authorize('create', CompanySubscription::class);
        $this->authorize('view', $company);

        $v = $request->validated();
        $plan = SubscriptionPlan::query()->findOrFail((string) $v['subscription_plan_id']);
        $allowInactive = (bool) ($v['allow_inactive_plan'] ?? false);

        [$prior, $created] = $this->provisioning->changeActivePlan(
            $company,
            $plan,
            CarbonImmutable::parse((string) $v['effective_starts_at']),
            isset($v['renews_at']) && $v['renews_at'] !== null
                ? CarbonImmutable::parse((string) $v['renews_at'])
                : null,
            isset($v['billing_contact_id']) ? (string) $v['billing_contact_id'] : null,
            isset($v['price_amount_minor_snapshot']) ? (int) $v['price_amount_minor_snapshot'] : null,
            isset($v['notes']) ? (string) $v['notes'] : null,
            $allowInactive,
        );

        $prior->loadMissing('plan');
        $created->load('plan');

        AuditRecorder::record($request->user(), $prior, 'company_subscription.cancelled', [
            'company_id' => (string) $company->id,
            'reason' => 'plan_change',
            'successor_subscription_id' => (string) $created->id,
        ], $request);

        AuditRecorder::record($request->user(), $created, 'company_subscription.plan_changed', [
            'company_id' => (string) $company->id,
            'prior_subscription_id' => (string) $prior->id,
            'prior_plan_id' => $prior->plan !== null ? (string) $prior->plan->id : null,
            'prior_plan_name' => $prior->plan?->name,
            'subscription_plan_id' => (string) $plan->id,
            'plan_name' => $plan->name,
            'starts_at' => $created->starts_at?->toDateString(),
            'renews_at' => $created->renews_at?->toDateString(),
            'price_amount_minor_snapshot' => (int) $created->price_amount_minor_snapshot,
        ], $request);

        return ApiResponses::success([
            'prior_subscription' => CompanySubscriptionResource::make($prior),
            'subscription' => CompanySubscriptionResource::make($created),
        ]);
    }

    public function cancel(CancelCompanySubscriptionRequest $request, Company $company): JsonResponse
    {
        $this->authorize('create', CompanySubscription::class);
        $this->authorize('view', $company);

        $v = $request->validated();

        $cancelled = $this->provisioning->cancelActive(
            $company,
            isset($v['cancellation_notes']) ? (string) $v['cancellation_notes'] : null,
            isset($v['cancelled_at']) && $v['cancelled_at'] !== null
                ? CarbonImmutable::parse((string) $v['cancelled_at'])
                : null,
        );

        $cancelled->load('plan');

        AuditRecorder::record($request->user(), $cancelled, 'company_subscription.cancelled', [
            'company_id' => (string) $company->id,
            'reason' => 'manual',
            'cancelled_at' => $cancelled->cancelled_at?->toIso8601String(),
        ], $request);

        return ApiResponses::success([
            'subscription' => CompanySubscriptionResource::make($cancelled),
        ]);
    }

    public function reactivate(ReactivateCompanySubscriptionRequest $request, Company $company): JsonResponse
    {
        $this->authorize('create', CompanySubscription::class);
        $this->authorize('view', $company);

        $v = $request->validated();
        $allowInactive = (bool) ($v['allow_inactive_plan'] ?? false);

        $planId = $v['subscription_plan_id'] ?? null;
        if ($planId === null || $planId === '') {
            $latest = $this->provisioning->latestSubscriptionRow($company);
            if ($latest === null) {
                return ApiResponses::error(
                    'No prior subscription found — choose a plan explicitly.',
                    'validation',
                    Response::HTTP_UNPROCESSABLE_ENTITY,
                );
            }
            $plan = $latest->plan;
            if ($plan === null) {
                $plan = SubscriptionPlan::query()->findOrFail((string) $latest->subscription_plan_id);
            }
        } else {
            $plan = SubscriptionPlan::query()->findOrFail((string) $planId);
        }

        $sub = $this->provisioning->reactivate(
            $company,
            $plan,
            CarbonImmutable::parse((string) $v['starts_at']),
            isset($v['renews_at']) && $v['renews_at'] !== null
                ? CarbonImmutable::parse((string) $v['renews_at'])
                : null,
            isset($v['billing_contact_id']) ? (string) $v['billing_contact_id'] : null,
            isset($v['price_amount_minor_snapshot']) ? (int) $v['price_amount_minor_snapshot'] : null,
            isset($v['notes']) ? (string) $v['notes'] : null,
            $allowInactive,
        );

        $sub->load('plan');

        AuditRecorder::record($request->user(), $sub, 'company_subscription.reactivated', [
            'company_id' => (string) $company->id,
            'subscription_plan_id' => (string) $plan->id,
            'plan_name' => $plan->name,
            'starts_at' => $sub->starts_at?->toDateString(),
            'renews_at' => $sub->renews_at?->toDateString(),
        ], $request);

        return ApiResponses::success([
            'subscription' => CompanySubscriptionResource::make($sub),
        ], 201);
    }

    public function updateBillingContact(
        UpdateCompanySubscriptionBillingContactRequest $request,
        Company $company,
        CompanySubscription $subscription,
    ): JsonResponse {
        $this->authorize('update', $subscription);
        $this->authorize('view', $company);

        if ((string) $subscription->company_id !== (string) $company->id) {
            abort(404);
        }

        $v = $request->validated();
        $beforeId = $subscription->billing_contact_id !== null ? (string) $subscription->billing_contact_id : null;

        $updated = $this->provisioning->updateBillingContact(
            $subscription,
            $company,
            (string) $v['billing_contact_id'],
        );

        $updated->load('plan');

        AuditRecorder::record($request->user(), $updated, 'company_subscription.billing_contact_changed', [
            'company_id' => (string) $company->id,
            'before_billing_contact_id' => $beforeId,
            'after_billing_contact_id' => (string) $updated->billing_contact_id,
        ], $request);

        return ApiResponses::success([
            'subscription' => CompanySubscriptionResource::make($updated),
        ]);
    }

    public function usage(Request $request, Company $company): JsonResponse
    {
        $this->authorize('view', $company);

        $user = $request->user();
        \assert($user instanceof User);
        if (! Permissions::userMay($user, Permissions::SUBSCRIPTIONS_VIEW)) {
            abort(403);
        }

        $sub = $company->subscription()->with('plan')->first();
        if ($sub === null) {
            return ApiResponses::success([
                'active_subscription' => null,
                'usage' => null,
            ]);
        }

        $usage = app(OrderSubscriptionCoverageService::class)->usageSummaryForSubscription($sub);

        return ApiResponses::success([
            'active_subscription' => [
                'id' => (string) $sub->id,
                'plan_name' => $sub->plan?->name,
                'starts_at' => $sub->starts_at?->format('Y-m-d'),
                'renews_at' => $sub->renews_at?->format('Y-m-d'),
            ],
            'usage' => $usage,
        ]);
    }

    public function generateInvoiceDraft(
        GenerateSubscriptionInvoiceDraftRequest $request,
        Company $company,
        CompanySubscription $subscription,
        GenerateSubscriptionInvoiceAction $generateSubscriptionInvoiceAction,
    ): JsonResponse {
        $this->authorize('view', $company);
        $this->authorize('create', Invoice::class);

        if ((string) $subscription->company_id !== (string) $company->id) {
            abort(404);
        }

        if ($subscription->status !== SubscriptionStatus::Active) {
            abort(422, 'Subscription must be active to generate a billing invoice draft.');
        }

        $v = $request->validated();

        $periodStart = isset($v['billing_period_start']) && $v['billing_period_start'] !== null
            ? CarbonImmutable::parse((string) $v['billing_period_start'])
            : ($subscription->starts_at !== null ? CarbonImmutable::parse($subscription->starts_at->toDateString()) : now()->startOfMonth());

        $periodEnd = isset($v['billing_period_end']) && $v['billing_period_end'] !== null
            ? CarbonImmutable::parse((string) $v['billing_period_end'])
            : ($subscription->renews_at !== null ? CarbonImmutable::parse($subscription->renews_at->toDateString()) : now()->endOfMonth());

        try {
            $result = $generateSubscriptionInvoiceAction->execute($subscription, $periodStart, $periodEnd);
        } catch (\Throwable $e) {
            AuditRecorder::record($request->user(), $subscription, 'invoice.subscription_generation_failed', [
                'subscription_id' => (string) $subscription->id,
                'billing_period_start' => $periodStart->toDateString(),
                'billing_period_end' => $periodEnd->toDateString(),
                'error' => $e->getMessage(),
            ], $request);
            throw $e;
        }

        $invoice = $result['invoice'];

        if ($result['already_existed']) {
            AuditRecorder::record($request->user(), $invoice, 'invoice.subscription_duplicate_prevented', [
                'subscription_id' => (string) $subscription->id,
                'billing_period_start' => $periodStart->toDateString(),
                'billing_period_end' => $periodEnd->toDateString(),
            ], $request);
        } else {
            AuditRecorder::record($request->user(), $invoice, 'invoice.subscription_draft_generated', [
                'subscription_id' => (string) $subscription->id,
                'billing_period_start' => $periodStart->toDateString(),
                'billing_period_end' => $periodEnd->toDateString(),
            ], $request);
        }

        return ApiResponses::success([
            'invoice' => InvoiceJson::detail($invoice),
            'already_existed' => (bool) $result['already_existed'],
        ], $result['already_existed'] ? 200 : 201);
    }
}
