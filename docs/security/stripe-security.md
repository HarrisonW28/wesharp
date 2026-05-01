# Stripe security — MVP

## Webhook endpoint

- **`POST /api/webhooks/stripe`** — **no** Bearer auth; validates **`Stripe-Signature`** with **`STRIPE_WEBHOOK_SECRET`** ( **`config('stripe.webhook_secret')`** ).
- Missing secret → **503** + **`error.code: webhook_not_configured`** (safe message).
- Invalid / expired signature → **400** + **`webhook_bad_request`** / **`webhook_error`**.

Implementation: **`App\Support\Stripe\StripeWebhookSignature`** (HMAC SHA-256, **v1** signatures, **±300s** clock tolerance).

## Event handling

After verification, **`stripe_webhook_events`** stores each **`evt_*` id**; duplicates are **not** re-processed (**`insertOrIgnore`**). Handlers that create **`Payment`** rows are **TODO** — see **`docs/integrations/stripe.md`**. Endpoint **acknowledges** with **`{ "received": true }`** so Stripe stops retrying.

## Frontend / publishable keys

**`STRIPE_PUBLISHABLE_KEY`** (if used in Next.js) must be **`NEXT_PUBLIC_*`** only for truly public keys — never embed secret keys client-side.

## Manual QA

1. With empty **`STRIPE_WEBHOOK_SECRET`**, **`curl -X POST`** the endpoint → **503** JSON envelope.
2. With secret set, compute a valid signature (see **`tests/Feature/Security/StripeWebhookSecurityTest`**) → **200** **`received: true`**.

## Tests

- **`tests/Feature/Security/StripeWebhookSecurityTest.php`** — missing secret + happy signature path.

## Known risks

- Webhook **business logic** not wired — payment duplication is avoided only until handlers run; implement **unique constraints** on provider IDs (e.g. **`stripe_payment_intent_id`**) when recording Stripe-settled payments.
- PSP **live** keys must use **separate** webhook secrets per environment; **`STRIPE_ALLOW_LIVE`** gates **`sk_live_*`** at the application layer.
