<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhooks;

use App\Services\Clerk\ClerkUserSynchronizer;
use App\Services\Notifications\InAppNotificationDispatcher;
use App\Support\ApiResponses;
use App\Support\Clerk\ClerkSvixSignature;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

/**
 * Clerk webhook ingress (Svix): signature verification, idempotent inbox row, user sync.
 */
final class ClerkWebhookController extends Controller
{
    public function __construct(
        private readonly ClerkUserSynchronizer $clerkUsers,
        private readonly InAppNotificationDispatcher $inAppNotifications,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $secret = (string) config('clerk.webhook_signing_secret', '');
        $raw = $request->getContent();

        try {
            ClerkSvixSignature::assertValid(
                $secret,
                $raw,
                $request->headers->get('svix-id'),
                $request->headers->get('svix-timestamp'),
                $request->headers->get('svix-signature'),
            );
        } catch (HttpException $e) {
            $code = match ($e->getStatusCode()) {
                SymfonyResponse::HTTP_SERVICE_UNAVAILABLE => 'webhook_not_configured',
                default => 'webhook_bad_request',
            };

            $safeMessage = config('app.debug')
                ? $e->getMessage()
                : match ($e->getStatusCode()) {
                    SymfonyResponse::HTTP_SERVICE_UNAVAILABLE => 'This webhook endpoint is not configured.',
                    default => 'Invalid webhook request.',
                };

            return ApiResponses::error($safeMessage, $code, $e->getStatusCode());
        } catch (Throwable) {
            return ApiResponses::error('Webhook validation failed.', 'webhook_error', SymfonyResponse::HTTP_BAD_REQUEST);
        }

        $body = json_decode($raw, true);
        if (! is_array($body)) {
            return ApiResponses::error('Invalid JSON payload.', 'webhook_bad_request', SymfonyResponse::HTTP_BAD_REQUEST);
        }

        $svixId = $request->headers->get('svix-id');
        if (! is_string($svixId) || $svixId === '') {
            return ApiResponses::error('Missing svix-id.', 'webhook_bad_request', SymfonyResponse::HTTP_BAD_REQUEST);
        }

        $type = isset($body['type']) && is_string($body['type']) ? $body['type'] : '';
        if ($type === '') {
            return ApiResponses::error('Missing event type.', 'webhook_bad_request', SymfonyResponse::HTTP_BAD_REQUEST);
        }

        $data = $body['data'] ?? [];
        if (! is_array($data)) {
            $data = [];
        }

        $now = now();

        $inserted = DB::table('webhook_inbox')->insertOrIgnore([
            'provider' => 'clerk',
            'external_id' => $svixId,
            'event_type' => $type,
            'processing_state' => 'received',
            'last_error' => null,
            'received_at' => $now,
            'processed_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        if ($inserted === 0) {
            return response()->json(['received' => true], SymfonyResponse::HTTP_OK);
        }

        try {
            $this->clerkUsers->applyClerkWebhook($type, $data);
        } catch (Throwable $e) {
            Log::warning('clerk.webhook.handler_failed', [
                'svix_id' => $svixId,
                'type' => $type,
                'message' => $e->getMessage(),
            ]);

            DB::table('webhook_inbox')
                ->where('provider', 'clerk')
                ->where('external_id', $svixId)
                ->update([
                    'processing_state' => 'failed',
                    'last_error' => $e->getMessage(),
                    'updated_at' => now(),
                ]);

            $this->inAppNotifications->notifyStaffWebhookProcessingFailed('clerk', $type, $svixId);

            return ApiResponses::error('Webhook handler failed.', 'webhook_handler_error', SymfonyResponse::HTTP_INTERNAL_SERVER_ERROR);
        }

        $done = now();

        DB::table('webhook_inbox')
            ->where('provider', 'clerk')
            ->where('external_id', $svixId)
            ->update([
                'processing_state' => 'processed',
                'processed_at' => $done,
                'updated_at' => $done,
            ]);

        Log::info('clerk.webhook.processed', ['svix_id' => $svixId, 'type' => $type]);

        return response()->json(['received' => true], SymfonyResponse::HTTP_OK);
    }
}
