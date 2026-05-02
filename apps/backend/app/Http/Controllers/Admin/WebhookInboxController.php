<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WebhookInbox;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;

/**
 * Recent webhook deliveries for operators (no raw payloads — metadata only).
 */
final class WebhookInboxController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', WebhookInbox::class);

        $rows = WebhookInbox::query()
            ->orderByDesc('id')
            ->limit(100)
            ->get(['id', 'provider', 'external_id', 'event_type', 'processing_state', 'last_error', 'received_at', 'processed_at', 'created_at']);

        return ApiResponses::success([
            'items' => $rows->map(static fn (WebhookInbox $r): array => [
                'id' => $r->id,
                'provider' => $r->provider,
                'external_id' => $r->external_id,
                'event_type' => $r->event_type,
                'processing_state' => $r->processing_state,
                'last_error' => $r->last_error,
                'received_at' => $r->received_at?->toIso8601String(),
                'processed_at' => $r->processed_at?->toIso8601String(),
                'created_at' => $r->created_at?->toIso8601String(),
            ])->values()->all(),
        ]);
    }
}
