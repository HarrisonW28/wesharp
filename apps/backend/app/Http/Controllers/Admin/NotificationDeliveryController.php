<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\Invoice;
use App\Models\NotificationDelivery;
use App\Models\Order;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class NotificationDeliveryController extends Controller
{
    public function bookingIndex(Request $request, Booking $booking): JsonResponse
    {
        $this->authorize('view', $booking);

        $rows = NotificationDelivery::query()
            ->where('source_type', Booking::class)
            ->where('source_id', $booking->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(static fn (NotificationDelivery $d): array => [
                'id' => (string) $d->id,
                'channel' => $d->channel,
                'type' => $d->type,
                'status' => $d->status,
                'recipient_email' => $d->recipient_email,
                'queued_at' => $d->queued_at?->toIso8601String(),
                'sent_at' => $d->sent_at?->toIso8601String(),
                'failed_at' => $d->failed_at?->toIso8601String(),
                'failure_reason' => $d->failure_reason,
                'created_at' => $d->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        return ApiResponses::success(['items' => $rows]);
    }

    public function orderIndex(Request $request, Order $order): JsonResponse
    {
        $this->authorize('view', $order);

        $rows = NotificationDelivery::query()
            ->where('source_type', Order::class)
            ->where('source_id', $order->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(static fn (NotificationDelivery $d): array => [
                'id' => (string) $d->id,
                'channel' => $d->channel,
                'type' => $d->type,
                'status' => $d->status,
                'recipient_email' => $d->recipient_email,
                'queued_at' => $d->queued_at?->toIso8601String(),
                'sent_at' => $d->sent_at?->toIso8601String(),
                'failed_at' => $d->failed_at?->toIso8601String(),
                'failure_reason' => $d->failure_reason,
                'created_at' => $d->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        return ApiResponses::success(['items' => $rows]);
    }

    public function invoiceIndex(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorize('view', $invoice);

        $rows = NotificationDelivery::query()
            ->where('source_type', Invoice::class)
            ->where('source_id', $invoice->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(static fn (NotificationDelivery $d): array => [
                'id' => (string) $d->id,
                'channel' => $d->channel,
                'type' => $d->type,
                'status' => $d->status,
                'recipient_email' => $d->recipient_email,
                'queued_at' => $d->queued_at?->toIso8601String(),
                'sent_at' => $d->sent_at?->toIso8601String(),
                'failed_at' => $d->failed_at?->toIso8601String(),
                'failure_reason' => $d->failure_reason,
                'created_at' => $d->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        return ApiResponses::success(['items' => $rows]);
    }

    public function subscriptionIndex(Request $request, Company $company, CompanySubscription $subscription): JsonResponse
    {
        if ((string) $subscription->company_id !== (string) $company->id) {
            abort(404);
        }

        $this->authorize('view', $subscription);

        $rows = NotificationDelivery::query()
            ->where('source_type', CompanySubscription::class)
            ->where('source_id', $subscription->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(static fn (NotificationDelivery $d): array => [
                'id' => (string) $d->id,
                'channel' => $d->channel,
                'type' => $d->type,
                'status' => $d->status,
                'recipient_email' => $d->recipient_email,
                'queued_at' => $d->queued_at?->toIso8601String(),
                'sent_at' => $d->sent_at?->toIso8601String(),
                'failed_at' => $d->failed_at?->toIso8601String(),
                'failure_reason' => $d->failure_reason,
                'created_at' => $d->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        return ApiResponses::success(['items' => $rows]);
    }
}
