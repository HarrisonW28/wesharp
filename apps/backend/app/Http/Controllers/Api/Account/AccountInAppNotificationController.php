<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Account;

use App\Enums\InAppNotificationAudience;
use App\Models\InAppNotification;
use App\Support\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class AccountInAppNotificationController extends TenantAccountController
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        \assert($user !== null);

        $perPage = min(75, max(1, (int) $request->query('per_page', 25)));
        $unreadOnly = $request->boolean('unread_only');

        $query = InAppNotification::query()
            ->where('user_id', $user->id)
            ->where('audience', InAppNotificationAudience::Customer)
            ->when($unreadOnly, static fn ($q) => $q->whereNull('read_at'))
            ->orderByDesc('created_at');

        $unreadCount = (int) InAppNotification::query()
            ->where('user_id', $user->id)
            ->where('audience', InAppNotificationAudience::Customer)
            ->whereNull('read_at')
            ->count();

        $paginator = $query->paginate($perPage);

        $items = collect($paginator->items())->map(static fn (InAppNotification $n): array => self::row($n))->values();

        $paginator->setCollection($items);

        $pagination = [
            'page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'total_pages' => (int) max(1, ceil($paginator->total() / max(1, $paginator->perPage()))),
            'has_more_pages' => $paginator->hasMorePages(),
        ];

        return ApiResponses::successWithMeta(
            ['pagination' => $pagination],
            [
                'items' => $items,
                'unread_count' => $unreadCount,
            ],
        );
    }

    public function markRead(Request $request, InAppNotification $notification): JsonResponse|Response
    {
        $this->authorize('update', $notification);

        $read = filter_var($request->input('read', true), FILTER_VALIDATE_BOOLEAN);

        $notification->read_at = $read ? now() : null;
        $notification->save();

        return ApiResponses::success(self::row($notification->fresh()));
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $user = $request->user();
        \assert($user !== null);

        InAppNotification::query()
            ->where('user_id', $user->id)
            ->where('audience', InAppNotificationAudience::Customer)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return ApiResponses::success(['ok' => true]);
    }

    /** @return array<string, mixed> */
    private static function row(InAppNotification $n): array
    {
        return [
            'id' => (string) $n->id,
            'kind' => $n->kind,
            'title' => $n->title,
            'body' => $n->body,
            'path' => $n->path,
            'read_at' => $n->read_at?->toIso8601String(),
            'created_at' => $n->created_at?->toIso8601String(),
        ];
    }
}
