<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WebhookInbox;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Recent Stripe webhook deliveries — metadata only (no raw Stripe payloads).
 */
final class StripeWebhookEventsController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', WebhookInbox::class);

        $rows = DB::table('stripe_webhook_events')
            ->orderByDesc('received_at')
            ->limit(100)
            ->get(['id', 'type', 'received_at', 'processed_at', 'processing_state', 'last_error', 'created_at']);

        return ApiResponses::success([
            'items' => $rows->map(static function ($r): array {
                return [
                    'id' => (string) $r->id,
                    'type' => (string) $r->type,
                    'received_at' => $r->received_at,
                    'processed_at' => $r->processed_at,
                    'processing_state' => (string) $r->processing_state,
                    'last_error' => $r->last_error !== null ? (string) $r->last_error : null,
                    'created_at' => $r->created_at,
                ];
            })->values()->all(),
        ]);
    }
}
