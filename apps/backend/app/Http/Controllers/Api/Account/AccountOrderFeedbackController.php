<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Account;

use App\Http\Requests\StoreAccountOrderFeedbackRequest;
use App\Models\Order;
use App\Models\OrderFeedback;
use App\Services\Audit\AuditRecorder;
use App\Support\ApiResponses;
use App\Support\Orders\OrderFeedbackJson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AccountOrderFeedbackController extends TenantAccountController
{
    public function show(Request $request, Order $order): JsonResponse
    {
        $this->authorize('view', $order);

        if ((string) $order->company_id !== $this->tenantCompanyId($request)) {
            abort(404);
        }

        $feedback = OrderFeedback::query()->where('order_id', $order->id)->first();
        if ($feedback === null) {
            return ApiResponses::success(null);
        }

        $this->authorize('view', $feedback);

        return ApiResponses::success(OrderFeedbackJson::portal($feedback));
    }

    public function store(StoreAccountOrderFeedbackRequest $request, Order $order): JsonResponse
    {
        $this->authorize('view', $order);

        if ((string) $order->company_id !== $this->tenantCompanyId($request)) {
            abort(404);
        }

        $feedback = OrderFeedback::query()->where('order_id', $order->id)->firstOrFail();
        $this->authorize('submit', $feedback);

        $data = $request->validated();

        $feedback->forceFill([
            'rating' => (int) $data['rating'],
            'comment' => isset($data['comment']) ? trim((string) $data['comment']) : null,
            'testimonial_interested' => (bool) ($data['testimonial_interested'] ?? false),
            'submitted_at' => now(),
        ])->save();

        AuditRecorder::record($request->user(), $order, 'order.feedback_submitted', [
            'feedback_id' => (string) $feedback->id,
            'rating' => $feedback->rating,
        ], $request);

        return ApiResponses::success(OrderFeedbackJson::portal($feedback->fresh()), 201);
    }
}
