# Stripe integration (foundation)

WeSharp records **manual payments** today. This document is the **Sprint 19.1** audit and configuration map for moving to **Stripe Checkout** safely.

## Product model (invoice-first)

| Flow | Stripe Checkout | Notes |
| --- | --- | --- |
| **One-off invoice / order** | **`mode=payment`** | Laravel is source of truth: issued invoice → Checkout Session for **outstanding balance** → webhook settles **`Payment`** / invoice. |
| **Subscription programmes** | **`mode=subscription`** (later) | Recurring entitlement and overage stay in-app; do **not** make the integration subscription-only. |

Browser success redirects are **not** authoritative; **webhooks** settle money movement.

## Environment variables (backend)

Copy from **`apps/backend/.env.example`**. Never commit secrets.

| Variable | Purpose |
| --- | --- |
| **`STRIPE_SECRET_KEY`** | Server secret (`sk_test_*` / `sk_live_*`). Required for any Stripe API call. |
| **`STRIPE_WEBHOOK_SECRET`** | Signing secret for **`POST /api/webhooks/stripe`** (`whsec_*`). **Required before** `STRIPE_HOSTED_CHECKOUT_ENABLED=true` in guards. |
| **`STRIPE_PUBLIC_KEY`** | Publishable key (`pk_*`) for server-side references / future Stripe.js. Optional until needed. |
| **`STRIPE_HOSTED_CHECKOUT_ENABLED`** | **`true`** only when intentionally exercising checkout wiring. Default **`false`** — most gates stay closed. |
| **`STRIPE_CHECKOUT_SUCCESS_URL`** | Customer return URL after Checkout (e.g. app invoice “thanks” page). **Required when hosted checkout is enabled.** |
| **`STRIPE_CHECKOUT_CANCEL_URL`** | Return URL if the customer abandons Checkout. **Required when hosted checkout is enabled.** |
| **`STRIPE_ALLOW_LIVE`** | Must be **`true`** to allow **`sk_live_*`** in checkout guards. Default **`false`**. |

Naming: the sprint spec also allows **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** on the **frontend** for Stripe.js only — see **`apps/frontend/env.local.example`**. The Laravel config key remains **`STRIPE_PUBLIC_KEY`** (`config('stripe.public')`).

## Feature-flag behaviour (no accidental charges)

Checkout availability is **`false`** until **all** of the following pass (see **`App\Services\Payments\StripePaymentProvider::hostedCheckoutAvailability`**):

1. **`STRIPE_SECRET_KEY`** set and shaped as `sk_test_*` or `sk_live_*` (and **`STRIPE_ALLOW_LIVE=true`** if live).
2. **`STRIPE_HOSTED_CHECKOUT_ENABLED=true`**.
3. **`STRIPE_WEBHOOK_SECRET`** non-empty (no hosted checkout without webhook verification path).
4. When (2) is true: **`STRIPE_CHECKOUT_SUCCESS_URL`** and **`STRIPE_CHECKOUT_CANCEL_URL`** both non-empty.
5. Invoice is **issued** (not Draft), not **Void**, not already **Paid**, with **positive outstanding** balance.

Even then, **Sprint 19.2** still implements Checkout Session creation — today the API returns a clear **“not implemented yet”** disabled reason after the gates above.

**No payment session is created** and **no card is captured** until 19.2+ implements `checkout.sessions.create` and webhooks settle **`Payment`** rows.

## Audit map (current code)

| Area | Location |
| --- | --- |
| Config | **`config/stripe.php`** |
| Provider guard + messages | **`App\Services\Payments\StripePaymentProvider`** |
| Hosted availability DTO | **`App\Services\Payments\HostedCheckoutAvailability`** |
| Checkout placeholder action | **`App\Actions\Payments\CreateStripeHostedCheckoutSessionAction`** |
| PSP contract | **`App\Contracts\Payments\PaymentProviderInterface`** |
| Admin: session placeholder API | **`InvoiceController::stripeCheckoutSession`** — **`POST /api/admin/invoices/{invoice}/stripe-checkout-session`** |
| Admin / portal JSON | **`App\Support\Stripe\StripeInvoicePresentation`**, **`InvoiceJson::detail`** (`stripe` panel) |
| Webhook | **`POST /api/webhooks/stripe`** — **`StripeWebhookController`**; signature **`App\Support\Stripe\StripeWebhookSignature`** |
| Idempotency store | **`stripe_webhook_events`** table |

## Developer setup checklist

1. Create a **Stripe test** account; copy **`sk_test_*`**, **`pk_test_*`**, create a **webhook endpoint** pointing at your tunnel/public URL **`.../api/webhooks/stripe`**.
2. Set **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`** (from `stripe listen` or Dashboard), optionally **`STRIPE_PUBLIC_KEY`**.
3. Leave **`STRIPE_HOSTED_CHECKOUT_ENABLED=false`** until **19.2** is deployed and tested.
4. When enabling checkout in a sandbox: set **`STRIPE_HOSTED_CHECKOUT_ENABLED=true`**, set **both** redirect URLs, run **`stripe listen --forward-to .../api/webhooks/stripe`**.
5. Keep **`STRIPE_ALLOW_LIVE=false`** until live webhooks and settlement are signed off.

## Webhook endpoint

- **URL:** **`POST /api/webhooks/stripe`** ( **`routes/api.php`** ).
- **Auth:** none; **`Stripe-Signature`** verified with **`config('stripe.webhook_secret')`**.
- **Idempotency:** event ids stored in **`stripe_webhook_events`**. Duplicate **`evt_*`** → **`200 { "received": true }`** without re-running handlers.
- **Handlers:** payment settlement **TODO** — events acknowledged as **`stripe.webhook.placeholder_ack`**. **Do not mark invoices paid** from redirect URLs alone.

## Event handling plan (go-live)

1. **`checkout.session.completed`** — resolve **`invoice_id`** from metadata; link **`stripe_checkout_session_id`**.
2. **`payment_intent.succeeded`** — create/update **`Payment`** (`stripe_payment_intent_id` unique), run the **same settlement path** as manual payment.
3. **`checkout.session.expired`**, failures — optional cleanup / UX; idempotent.

## Testing

- **`tests/Feature/AdminStripeCheckoutPlaceholderApiTest`** — placeholder API permissions and shape.
- **`tests/Feature/Security/StripeWebhookSecurityTest`**, **`tests/Feature/StripeWebhookIdempotencyTest`** — webhook edge cases.
- **Stripe CLI:** `stripe listen --forward-to localhost:8000/api/webhooks/stripe`.

## Related

- **`docs/security/stripe-security.md`** — webhook security.
- **`docs/product/orders-invoices-payments.md`** — AR and manual payments.
- **`docs/roadmap/sprint-19.md`** — phased delivery (19.1 audit/config → 19.2 Checkout → 19.3 webhooks).
