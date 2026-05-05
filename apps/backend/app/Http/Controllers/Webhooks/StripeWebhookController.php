<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhooks;

use App\Support\ApiResponses;
use App\Support\Stripe\ResolvedStripeConfig;
use App\Support\Stripe\StripeWebhookPaymentProcessor;
use App\Support\Stripe\StripeWebhookSignature;
use App\Support\Stripe\StripeWebhookSubscriptionProcessor;
use App\Services\Notifications\InAppNotificationDispatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

/**
 * Stripe webhook ingress: signature verification + idempotent event handling.
 *
 * - Duplicate {@see $eventId}: second request short-circuits after insertOrIgnore (still 200).
 * - {@see processing_state} = processed: handlers are not run again.
 * - {@see processing_state} = failed: Stripe retries are honoured (handlers run again).
 */
final class StripeWebhookController extends Controller
{
    public function __invoke(
        Request $request,
        ResolvedStripeConfig $stripeConfig,
        StripeWebhookPaymentProcessor $paymentProcessor,
        StripeWebhookSubscriptionProcessor $subscriptionProcessor,
        InAppNotificationDispatcher $inAppNotifications,
    ): JsonResponse {
        $secret = $stripeConfig->webhookSecret();
        $raw = $request->getContent();

        try {
            StripeWebhookSignature::assertValid($secret, $raw, $request->headers->get('Stripe-Signature'));
        } catch (HttpException $e) {
            $code = match ($e->getStatusCode()) {
                503 => 'webhook_not_configured',
                400 => 'webhook_bad_request',
                default => 'webhook_error',
            };

            $safeMessage = config('app.debug')
                ? $e->getMessage()
                : match ($e->getStatusCode()) {
                    503 => 'This webhook endpoint is not configured.',
                    default => 'Invalid webhook request.',
                };

            return ApiResponses::error($safeMessage, $code, $e->getStatusCode());
        } catch (Throwable) {
            return ApiResponses::error('Webhook validation failed.', 'webhook_error', SymfonyResponse::HTTP_BAD_REQUEST);
        }

        /** @var array<string, mixed>|null $data */
        $data = json_decode($raw, true);
        if (! is_array($data)) {
            return ApiResponses::error('Invalid JSON payload.', 'webhook_bad_request', SymfonyResponse::HTTP_BAD_REQUEST);
        }

        $eventId = $data['id'] ?? null;
        if (! is_string($eventId) || $eventId === '') {
            return ApiResponses::error('Missing event id.', 'webhook_bad_request', SymfonyResponse::HTTP_BAD_REQUEST);
        }

        $type = isset($data['type']) && is_string($data['type']) ? $data['type'] : 'unknown';
        $now = now();

        DB::table('stripe_webhook_events')->insertOrIgnore([
            'id' => $eventId,
            'type' => $type,
            'received_at' => $now,
            'processing_state' => 'received',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $handlerError = null;

        DB::transaction(function () use (
            $eventId,
            $data,
            $paymentProcessor,
            $subscriptionProcessor,
            &$handlerError,
            $inAppNotifications,
        ): void {
            $row = DB::table('stripe_webhook_events')->where('id', $eventId)->lockForUpdate()->first();
            if ($row === null) {
                return;
            }

            if ($row->processing_state === 'processed') {
                return;
            }

            try {
                $paymentProcessor->process($data);
                $subscriptionProcessor->process($data);
                DB::table('stripe_webhook_events')->where('id', $eventId)->update([
                    'processing_state' => 'processed',
                    'processed_at' => now(),
                    'last_error' => null,
                    'updated_at' => now(),
                ]);
            } catch (Throwable $e) {
                Log::error('stripe.webhook.handler_failed', [
                    'stripe_event_id' => $eventId,
                    'type' => $data['type'] ?? null,
                    'message' => $e->getMessage(),
                ]);
                /** @var string $stripeType */
                $stripeType = is_string($data['type'] ?? null) ? (string) $data['type'] : 'unknown';
                DB::table('stripe_webhook_events')->where('id', $eventId)->update([
                    'processing_state' => 'failed',
                    'last_error' => Str::limit($e->getMessage(), 2000),
                    'updated_at' => now(),
                ]);
                $inAppNotifications->notifyStaffWebhookProcessingFailed('stripe', $stripeType, $eventId);
                $handlerError = $e;
            }
        });

        if ($handlerError instanceof Throwable) {
            return response()->json(['received' => false], SymfonyResponse::HTTP_INTERNAL_SERVER_ERROR);
        }

        return response()->json(['received' => true], SymfonyResponse::HTTP_OK);
    }
}
