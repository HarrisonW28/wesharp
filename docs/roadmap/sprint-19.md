# WeSharp Sprint 19 — Stripe Payments, Subscriptions and Checkout Abandonment

## Context

Stripe is currently intended/stubbed and should be implemented carefully.

WeSharp should support both one-off invoice payments and recurring subscriptions. Do not make Stripe subscription-only.

Recommended model:
- Order → Invoice → Payment
- Subscription → recurring entitlement/allowance → usage/overage → invoice/payment

## Sprint principles

- Invoice-first for one-off payments.
- Use Stripe Checkout mode=payment for invoices.
- Use Stripe Checkout mode=subscription for plans.
- Laravel remains source of truth for customers, companies, roles, invoices, subscriptions and usage.
- Webhooks are authoritative for payment/subscription state.
- Browser success redirects are not authoritative.
- Implementation must be idempotent.
- Feature flag Stripe until configured.
- Do not store secrets in frontend.
- Marketing consent must be separate from terms.

---

## 19.1 — Stripe Integration Audit and Configuration

### Goal

Audit current Stripe stubs/docs and prepare configuration.

### Check

- Stripe provider implementation
- invoice controller hooks
- webhook route/controller
- existing payment models
- invoice statuses
- subscription models
- env variables
- docs/integrations/stripe.md
- allow developer to setup keys/setup iundern system 

### Required env

- STRIPE_SECRET_KEY
- STRIPE_PUBLISHABLE_KEY or NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY where appropriate
- STRIPE_WEBHOOK_SECRET
- STRIPE_HOSTED_CHECKOUT_ENABLED
- success/cancel URLs

### Acceptance criteria

- Current stubs are understood.
- Required env is documented.
- Feature flag behaviour is clear.
- No payment code is enabled without config.

---

## 19.2 — One-Off Invoice Checkout

### Goal

Implement invoice-first Stripe Checkout for one-off payments.

### Flow

1. Order/items priced.
2. Invoice created/issued.
3. Backend creates Stripe Checkout Session in payment mode.
4. Metadata/client_reference_id includes invoice_id, order_id, company_id/customer id as needed.
5. Frontend redirects to session.url.
6. Success/cancel returns to app.
7. Webhook settles invoice/payment.

### Requirements

- Do not trust success URL alone.
- Prevent checkout for invalid/paid/void invoices.
- Support outstanding balance line item.
- Store Stripe session/payment references.
- Idempotency for repeated attempts.

### Acceptance criteria

- Admin/customer can pay invoice through Stripe Checkout where allowed.
- Paid invoices are not paid twice.
- Invalid invoices cannot create checkout.
- Payment record is created/updated via webhook.

---

## 19.3 — Stripe Payment Webhooks and Settlement

### Goal

Make Stripe webhooks authoritative and idempotent.

### Handle at least

- checkout.session.completed
- payment_intent.succeeded
- payment_intent.payment_failed if useful
- checkout.session.expired

### Requirements

- Verify webhook signature.
- Store event IDs to avoid duplicate processing.
- Link session/payment intent to invoice/order/customer.
- Use same settlement path as manual payment.
- Log failures safely.
- Do not expose raw payloads to non-developer roles.

### Acceptance criteria

- Successful checkout marks invoice/payment correctly.
- Duplicate webhook does not duplicate payment.
- Failed/expired events are recorded.
- Developer can inspect webhook logs.

---

## 19.4 — Stripe Subscriptions

### Goal

Implement subscription checkout for recurring plans.

### Flow

1. Admin/customer selects plan where allowed.
2. Backend creates Checkout Session mode=subscription.
3. Stripe subscription/customer IDs are stored.
4. Webhooks update local subscription state.
5. Laravel tracks allowance/usage/overage.

### Handle at least

- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.paid
- invoice.payment_failed

### Acceptance criteria

- Subscription checkout works where enabled.
- Local subscription status updates via webhooks.
- Failed payment is visible.
- Usage/allowance remains Laravel-owned.
- One-off payments still work.

---

## 19.5 — Subscription Usage, Overage and Revenue Reporting Integration

### Goal

Ensure subscription-covered usage is not confused with one-off revenue.

### Requirements

- show covered knives/items
- show overage items
- show subscription revenue
- show one-off invoice revenue
- show recurring revenue metrics
- report failed subscription payments
- keep GBP formatting

### Acceptance criteria

- Subscription customers show correct coverage.
- Overage can be invoiced or tracked.
- Dashboard/reports separate one-off and recurring revenue.
- Finance/admin views are clear.

---

## 19.6 — Marketing Consent and Checkout Attempts

### Goal

Track abandoned checkout safely and legally.

### Marketing consent

Add/store separately:
- terms_accepted_at
- marketing_opt_in
- marketing_opt_in_at
- marketing_opt_in_source

Do not treat terms acceptance as marketing consent.

### Checkout attempts

Create/persist attempt records for Stripe checkout:
- invoice_id
- order_id
- company/customer/contact
- email
- marketing_opt_in
- stripe_checkout_session_id
- status pending/completed/expired/abandoned
- expires_at

### Acceptance criteria

- Consent is explicit and stored separately.
- Checkout attempts are tracked.
- Completed/expired sessions update attempt status.
- No marketing follow-up is sent without opt-in.

---

## 19.7 — Abandoned Checkout Sales Follow-Up

### Goal

Create a safe follow-up path for eligible abandoned checkouts.

### First version

- track Stripe Checkout abandonment only
- create internal sales task/notification for abandoned eligible attempts
- optionally send one reminder only if marketing_opt_in is true
- respect quiet hours where practical
- avoid duplicate reminders

### Do not yet

- build complex marketing automation
- track full booking wizard abandonment unless explicitly small/safe
- send marketing emails without consent

### Acceptance criteria

- Expired checkout can become abandoned attempt.
- Eligible abandoned attempts create internal follow-up.
- Marketing email only sends if opted in.
- Duplicate follow-ups are prevented.

---

## 19.8 — Sprint 19 Regression QA

### Goal

Regression test Sprint 19 only.

### Check

- Stripe config/feature flag
- one-off invoice checkout
- webhook signature verification
- payment settlement
- duplicate webhook handling
- subscription checkout
- subscription webhooks
- usage/overage display
- revenue reporting split
- consent storage
- abandoned checkout tracking
- sales follow-up rules
- permissions/dev logs

### Required output

At the end, provide:
- QA checks completed
- bugs found
- bugs fixed
- files changed
- deferred Stripe issues
- Sprint 19 verdict: PASS / FAIL
