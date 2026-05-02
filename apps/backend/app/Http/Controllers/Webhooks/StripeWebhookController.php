<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhooks;

use App\Support\ApiResponses;
use App\Support\Stripe\StripeWebhookSignature;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

/**
 * Stripe webhook ingress: signature verification + idempotent event id storage.
 *
 * Business handlers (payment_intent.succeeded → Payment row) must:
 * - run only after verification
 * - use DB idempotency (e.g. unique stripe_payment_intent_id on payments) so external retries never duplicate ledger rows
 */
final class StripeWebhookController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $secret = (string) config('stripe.webhook_secret', '');
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

        $inserted = DB::table('stripe_webhook_events')->insertOrIgnore([
            'id' => $eventId,
            'type' => $type,
            'received_at' => $now,
            'processing_state' => 'received',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        if ($inserted === 0) {
            return response()->json(['received' => true], SymfonyResponse::HTTP_OK);
        }

        // TODO (go-live): dispatch a queued job; map payment_intent.succeeded / checkout.session.completed
        // to RecordManualPaymentAction or a dedicated Stripe settlement path. Never trust the frontend.
        Log::info('stripe.webhook.placeholder_ack', [
            'stripe_event_id' => $eventId,
            'type' => $type,
        ]);

        DB::table('stripe_webhook_events')->where('id', $eventId)->update([
            'processed_at' => $now,
            'processing_state' => 'placeholder_ack',
            'updated_at' => $now,
        ]);

        return response()->json(['received' => true], SymfonyResponse::HTTP_OK);
    }
}
