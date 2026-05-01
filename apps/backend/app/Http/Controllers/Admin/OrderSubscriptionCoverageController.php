<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\InvoiceStatus;
use App\Enums\SubscriptionOrderItemBillingKind;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\OverrideOrderSubscriptionCoverageRequest;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use App\Services\Audit\AuditRecorder;
use App\Services\Subscriptions\OrderSubscriptionCoverageService;
use App\Support\ApiResponses;
use App\Support\Orders\OrderJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class OrderSubscriptionCoverageController extends Controller
{
    public function recompute(Request $request, Order $order): JsonResponse
    {
        $this->authorize('update', $order);

        DB::transaction(function () use ($order): void {
            $order->subscription_coverage_overridden = false;
            $order->subscription_coverage_override_reason = null;
            $order->save();
        });

        $order->refresh();
        $order->load(['booking', 'items', 'knives', 'company']);
        app(OrderSubscriptionCoverageService::class)->computeAndPersist($order);

        $viewer = $request->user();
        \assert($viewer instanceof User);
        AuditRecorder::record($viewer, $order->fresh(), 'order.subscription_coverage_recomputed', [
            'order_id' => (string) $order->id,
        ], $request);

        $order->refresh();
        $order->loadMissing([
            'company:id,name,city',
            'booking' => fn ($q) => $q->with(['contact', 'location']),
            'items' => fn ($q) => $q->orderBy('created_at')->with(['knife:id,knife_status,label,tag_id']),
            'knives' => fn ($q) => $q->orderBy('position')->orderBy('created_at')->limit(500),
            'invoices' => fn ($q) => $q
                ->where('invoice_status', '!=', InvoiceStatus::Void->value)
                ->orderByDesc('created_at')
                ->with('items')
                ->limit(1),
        ]);

        return ApiResponses::success(OrderJson::detail($order));
    }

    public function overrideOneOff(OverrideOrderSubscriptionCoverageRequest $request, Order $order): JsonResponse
    {
        $this->authorize('update', $order);

        $reason = (string) $request->validated()['reason'];
        $units = app(OrderSubscriptionCoverageService::class)->measureOrderUnits($order->fresh()->load(['booking', 'items', 'knives']));

        DB::transaction(function () use ($order, $reason, $units): void {
            OrderItem::query()->where('order_id', $order->id)->update([
                'subscription_billing_kind' => SubscriptionOrderItemBillingKind::Na->value,
            ]);

            $order->company_subscription_id = null;
            $order->subscription_coverage_overridden = true;
            $order->subscription_coverage_override_reason = $reason;
            $order->subscription_coverage = [
                'mode' => 'one_off',
                'company_subscription_id' => null,
                'subscription_plan_id' => null,
                'plan_name' => null,
                'collection_units' => $units['collection_units'],
                'knife_units' => $units['knife_units'],
                'collections_included_for_order' => 0,
                'collections_overage_for_order' => 0,
                'knives_included_for_order' => 0,
                'knives_overage_for_order' => 0,
                'overage_unit_price_pence' => 0,
                'overage_total_pence' => 0,
                'included_summary' => 'Manual override — treat as one-off billing. '.$reason,
            ];
            $order->subscription_coverage_computed_at = now();
            $order->save();
        });

        $viewer = $request->user();
        \assert($viewer instanceof User);
        AuditRecorder::record($viewer, $order->fresh(), 'order.subscription_coverage_override', [
            'order_id' => (string) $order->id,
            'reason' => $reason,
        ], $request);

        $order->refresh();
        $order->loadMissing([
            'company:id,name,city',
            'booking' => fn ($q) => $q->with(['contact', 'location']),
            'items' => fn ($q) => $q->orderBy('created_at')->with(['knife:id,knife_status,label,tag_id']),
            'knives' => fn ($q) => $q->orderBy('position')->orderBy('created_at')->limit(500),
            'invoices' => fn ($q) => $q
                ->where('invoice_status', '!=', InvoiceStatus::Void->value)
                ->orderByDesc('created_at')
                ->with('items')
                ->limit(1),
        ]);

        return ApiResponses::success(OrderJson::detail($order));
    }
}
