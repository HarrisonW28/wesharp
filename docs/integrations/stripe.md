# Stripe integration (foundation)

WeSharp records **manual payments** today. This document maps **Stripe Checkout** for **one-off invoices** and **recurring plans**.

## Product model (invoice-first + subscriptions)

| Flow | Stripe Checkout | Notes |
| --- | --- | --- |
| **One-off invoice / order** | **`mode=payment`** | Issued invoice → Checkout for **outstanding balance** → webhook settles **`Payment`** / invoice. |
| **Subscription programmes** | **`mode=subscription`** | Plan carries **`stripe_price_id`** → tenant **`POST /api/account/subscription/stripe-checkout-session`** → webhooks sync **`CompanySubscription`** (`stripe_subscription_id`). **Allowance and usage stay in Laravel.** |

Browser success redirects are **not** authoritative; **webhooks** apply money and subscription state.

## Environment variables (backend)

Copy from **`apps/backend/.env.example`**. Never commit secrets.

| Variable | Purpose |
| --- | --- |
| **`STRIPE_SECRET_KEY`** | Server secret (`sk_test_*` / `sk_live_*`). Required for any Stripe API call. |
| **`STRIPE_WEBHOOK_SECRET`** | Signing secret for **`POST /api/webhooks/stripe`** (`whsec_*`). **Required before** `STRIPE_HOSTED_CHECKOUT_ENABLED=true` in guards. |
| **`STRIPE_PUBLIC_KEY`** | Publishable key (`pk_*`) for server-side references / future Stripe.js. Optional until needed. |
| **`STRIPE_HOSTED_CHECKOUT_ENABLED`** | **`true`** only when intentionally exercising checkout wiring. Default **`false`** — most gates stay closed. |
| **`STRIPE_CHECKOUT_SUCCESS_URL`** | Return URL after Checkout. **Required when hosted checkout is enabled.** |
| **`STRIPE_CHECKOUT_CANCEL_URL`** | Cancel URL. **Required when hosted checkout is enabled.** |
| **`STRIPE_ALLOW_LIVE`** | Must be **`true`** to allow **`sk_live_*`** in checkout guards. Default **`false`**. |

Naming: the sprint spec also allows **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** on the **frontend** for Stripe.js only — see **`apps/frontend/env.local.example`**. The Laravel config key remains **`STRIPE_PUBLIC_KEY`** (`config('stripe.public')`).

### System settings (encrypted database overrides)

For most fields, developers and super admins may store Stripe secrets and flags in **`stripe_settings`** (Laravel `encrypted` casts — **requires stable `APP_KEY`**); values in the database **override** **`.env`** at runtime via **`App\Support\Stripe\ResolvedStripeConfig`**.

**Hosted checkout is different:** **`STRIPE_HOSTED_CHECKOUT_ENABLED`** (`config('stripe.hosted_checkout_enabled')`) is a **master switch**. When **`false`**, hosted Checkout stays **off** even if **`stripe_settings.hosted_checkout_enabled`** is **`true`**. When the env flag is **`true`**, the database value applies: **`null`** inherits “on”, **`false`** forces off, **`true`** forces on. **`GET /api/admin/stripe-settings`** returns **`env_config`** and **`effective`** for this control.

- **API:** **`GET|PUT /api/admin/stripe-settings`** — permission **`system.integrations.manage`** (withheld from **`admin`** and other staff roles).
- **UI:** Admin **Settings → System → Stripe** (`/admin/system/stripe`).
- **Responses:** Full keys are never returned; only masked previews for database-stored values plus effective booleans/URLs.
- **Audit:** Updates emit **`stripe_settings.updated`** (field names only — no secret values).
- **Clearing an override:** send an empty string for a key field to remove the database value and fall back to **`.env`**.

## Feature-flag behaviour (no accidental charges)

Shared gates live in **`App\Support\Stripe\StripeCheckoutEnvironmentGuard`** (used for both one-off and subscription Checkout):

1. **`STRIPE_SECRET_KEY`** set and shaped as `sk_test_*` or `sk_live_*` (and **`STRIPE_ALLOW_LIVE=true`** if live).
2. **`STRIPE_HOSTED_CHECKOUT_ENABLED=true`**.
3. **`STRIPE_WEBHOOK_SECRET`** non-empty.
4. **`STRIPE_CHECKOUT_SUCCESS_URL`** and **`STRIPE_CHECKOUT_CANCEL_URL`** both non-empty.

**Invoices** — additionally: not Draft / Void / Paid, with outstanding balance (**`StripePaymentProvider::invoiceHostedCheckoutPreview`** / **`createInvoiceHostedCheckoutSession`**).

**Plans** — additionally: **`stripe_price_id`** set on the plan, plan **active**, company has **no** active/past-due operational subscription (**`StripeSubscriptionCheckoutService`**).

## Audit map (current code)

| Area | Location |
| --- | --- |
| Config | **`config/stripe.php`** |
| Invoice checkout | **`App\Services\Payments\StripePaymentProvider`**, **`CreateStripeHostedCheckoutSessionAction`** |
| Subscription checkout | **`App\Services\Subscriptions\StripeSubscriptionCheckoutService`**, **`CreateStripeSubscriptionCheckoutSessionAction`** |
| Hosted availability DTO | **`App\Services\Payments\HostedCheckoutAvailability`** |
| PSP contract | **`App\Contracts\Payments\PaymentProviderInterface`** |
| Admin invoice session | **`POST /api/admin/invoices/{invoice}/stripe-checkout-session`** |
| Account invoice session | **`POST /api/account/invoices/{invoice}/stripe-checkout-session`** |
| Account subscription session | **`POST /api/account/subscription/stripe-checkout-session`** |
| Admin / portal JSON | **`App\Support\Stripe\StripeInvoicePresentation`**, **`InvoiceJson::detail`** (`stripe` panel) |
| Webhook | **`POST /api/webhooks/stripe`** — **`StripeWebhookController`**; **`StripeWebhookSignature`** |
| Webhook processors | **`StripeWebhookPaymentProcessor`**, **`StripeWebhookSubscriptionProcessor`** |
| Stripe subscription API wrapper | **`App\Services\Stripe\StripeSubscriptionRetrieveClient`** |
| Idempotency store | **`stripe_webhook_events`** (`processing_state`, **`last_error`**) |
| Developer Stripe event log (no raw bodies) | **`GET /api/admin/stripe-webhook-events`** |

## Developer setup checklist

1. Create a **Stripe test** account; copy **`sk_test_*`**, **`pk_test_*`**, create a **webhook endpoint** pointing at your tunnel/public URL **`.../api/webhooks/stripe`** (subscribe to events you handle, including **`checkout.session.completed`**, **`payment_intent.succeeded`**, **`customer.subscription.updated`**, etc.).
2. Set **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`**, optionally **`STRIPE_PUBLIC_KEY`**.
3. Create **Products/Prices** in Stripe; set **`stripe_price_id`** on **`subscription_plans`** via admin API.
4. When enabling checkout in a sandbox: set **`STRIPE_HOSTED_CHECKOUT_ENABLED=true`**, set **both** redirect URLs, run **`stripe listen --forward-to .../api/webhooks/stripe`**.
5. Keep **`STRIPE_ALLOW_LIVE=false`** until live webhooks and reconciliation are signed off.

## Webhook endpoint

- **URL:** **`POST /api/webhooks/stripe`** ( **`routes/api.php`** ).
- **Auth:** none; **`Stripe-Signature`** verified with **`config('stripe.webhook_secret')`**.
- **Idempotency:** one row per event id; **`processed`** handlers are not run again; **`failed`** allows Stripe retries.
- **Handlers:** one-off invoice settlement (**`mode=payment`**); subscription **`checkout.session.completed`** / **`customer.subscription.*`**; Stripe Billing **`invoice.paid`** (sync subscription / clear failure) and **`invoice.payment_failed`** (local **`PastDue`** + timestamp for portal visibility); failures stored in **`last_error`** (truncated).

## Testing

- **`tests/Feature/AdminStripeCheckoutPlaceholderApiTest`**, **`AdminStripeCheckoutSessionCreateTest`**
- **`tests/Feature/StripeWebhookInvoiceSettlementTest`**, **`StripeWebhookIdempotencyTest`**, **`StripeWebhookSubscriptionActivationTest`**
- **`tests/Feature/StripeSubscriptionInvoiceWebhookTest`**, **`AccountSettingsConsentTest`**, **`AdminStripeSettingsApiTest`**
- **Stripe CLI:** `stripe listen --forward-to localhost:8000/api/webhooks/stripe`

## Related

Portal **account settings** stores **`terms_accepted_at`** and **marketing opt-in** as separate fields (`user.accept_portal_terms` vs `user.marketing_opt_in`) — accepting terms does **not** imply marketing consent.

- **`docs/security/stripe-security.md`** — webhook security.
- **`docs/product/orders-invoices-payments.md`** — AR and manual payments.
- **`docs/roadmap/sprint-19.md`** — phased delivery.
