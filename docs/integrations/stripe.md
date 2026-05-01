# Stripe integration (foundation)

WeSharp uses **manual payment recording** today; this document describes the **safe path** toward Stripe Checkout and webhooks without enabling live card capture by default.

## Environment variables (backend)

| Variable | Purpose |
| --- | --- |
| **`STRIPE_SECRET_KEY`** | Server-side secret (`sk_test_*` / `sk_live_*`). Never commit; never expose to the browser. |
| **`STRIPE_WEBHOOK_SECRET`** | Signing secret for **`POST /api/webhooks/stripe`** (`whsec_*`). Required before treating webhooks as authentic. |
| **`STRIPE_PUBLIC_KEY`** | Publishable key (`pk_*`) for future Stripe.js / Checkout client redirects. Optional until UI needs it. |
| **`STRIPE_HOSTED_CHECKOUT_ENABLED`** | `true` only when intentionally testing hosted checkout (still returns no URL until API is implemented). Default `false`. |
| **`STRIPE_ALLOW_LIVE`** | Must be `true` to allow **`sk_live_*`** for checkout-related flows. Default `false` blocks live keys at the provider guard. |

Copy from **`apps/backend/.env.example`**. No secrets belong in git.

## Frontend (later)

For Stripe.js or redirect flows, use **`NEXT_PUBLIC_`** only for the **publishable** key (e.g. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`), never secret keys. See **`apps/frontend/env.local.example`**.

## Architecture

- **`App\Contracts\Payments\PaymentProviderInterface`** — PSP abstraction; **`StripePaymentProvider`** is the current implementation.
- **`CreateStripeHostedCheckoutSessionAction`** — placeholder for Checkout Session creation (no Stripe HTTP calls yet).
- **`InvoiceJson::detail`** includes a **`stripe`** object for admin UI (availability, diagnostics without secrets).
- **External IDs** (migrations): **`companies.stripe_customer_id`**, **`invoices` / `payments`** — **`stripe_checkout_session_id`**, **`stripe_payment_intent_id`** (for reconciliation and idempotent webhook handling).

## Webhook endpoint

- **URL:** **`POST /api/webhooks/stripe`** (see **`routes/api.php`**).
- **Auth:** none; **`Stripe-Signature`** verified with **`config('stripe.webhook_secret')`** via **`StripeWebhookSignature`**.
- **Idempotency:** event ids are stored in **`stripe_webhook_events`**. Duplicate **`evt_*`** deliveries return **`200 { "received": true }`** without re-running handlers.
- **Handlers:** not implemented for payments yet — events are acknowledged and logged as **`stripe.webhook.placeholder_ack`**. **Do not mark invoices paid** until a verified handler uses DB idempotency (e.g. unique **`stripe_payment_intent_id`** on **`payments`**) and audits the outcome.

## Event handling plan (go-live)

1. **`checkout.session.completed`** — resolve **`invoice_id`** from metadata; optional link **`stripe_checkout_session_id`** on **`invoices`**.
2. **`payment_intent.succeeded`** — create or update **`Payment`** with method **`stripe`**, set **`stripe_payment_intent_id`**, **`amount_pence`**, run existing invoice settlement logic (same as manual path), **audit**.
3. **`charge.refunded` / `payment_intent.canceled`** — future refund/void alignment; never duplicate positive ledger rows on retries.

All of the above must run **only** after signature verification and **idempotent** DB checks.

## Testing

- **Unit / feature:** **`tests/Feature/Security/StripeWebhookSecurityTest`**, **`StripeWebhookIdempotencyTest`**, **`AdminStripeCheckoutPlaceholderApiTest`**.
- **Stripe CLI:** `stripe listen --forward-to localhost:8000/api/webhooks/stripe` then trigger test events; confirm **`200`** and **`stripe_webhook_events`** rows (no duplicate payments).
- **Local:** leave **`STRIPE_WEBHOOK_SECRET`** empty to get **503** on unsigned calls (expected until configured).

## What remains before live Stripe

1. Implement Checkout Session / PaymentIntent creation server-side and return **`checkout_url`** only when safe.
2. Implement webhook job(s) that create **`Payment`** rows and update invoice status — **never** trust client callbacks alone.
3. E2E test in **test mode** with real Stripe test keys and CLI forwarding.
4. Operational runbook: rotate secrets, separate test/live webhook endpoints, monitor **`stripe_webhook_events.processing_state`**.

## Related

- **`docs/security/stripe-security.md`** — webhook security notes.
- **`docs/product/orders-invoices-payments.md`** — AR and manual payments.
