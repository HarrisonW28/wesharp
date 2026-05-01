<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\NotificationDelivery;
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
}

