<?php

namespace App\Http\Controllers\Webhooks;

use App\Support\ApiResponses;
use App\Support\Stripe\StripeWebhookSignature;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

/**
 * Stripe Connect / Billing webhook ingress (payload handling is backlog — signature verification is real).
 */
final class StripeWebhookController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $secret = (string) config('services.stripe.webhook_secret', '');

        try {
            StripeWebhookSignature::assertValid($secret, $request->getContent(), $request->headers->get('Stripe-Signature'));
        } catch (HttpException $e) {
            $code = match ($e->getStatusCode()) {
                503 => 'webhook_not_configured',
                400 => 'webhook_bad_request',
                default => 'webhook_error',
            };

            return ApiResponses::error($e->getMessage(), $code, $e->getStatusCode());
        } catch (Throwable) {
            return ApiResponses::error('Webhook validation failed.', 'webhook_error', SymfonyResponse::HTTP_BAD_REQUEST);
        }

        /** Event dispatch / idempotency keys land in backlog — acknowledge for Stripe retries. */
        return response()->json(['received' => true], SymfonyResponse::HTTP_OK);
    }
}
