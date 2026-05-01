# Subscription & recurring invoices (foundation → Sprint 9 / 11)

This document describes **Sprint 7.7 foundations** and how **Sprint 9** (subscription product) and **Sprint 11** (scheduling/queues) build on them. Full subscription management and automatic billing are **not** enabled by default.

---

## Data model (7.7)

### Invoice (`invoices`)

| Field | Purpose |
| --- | --- |
| **`source_type`** | `order` \| `company_subscription` (`App\Enums\InvoiceSourceType`) |
| **`source_id`** | UUID of source entity (order id or `company_subscriptions.id`) |
| **`billing_period_start`** / **`billing_period_end`** | Inclusive subscription billing window (nullable for order-based invoices) |
| **`order_id`** | Nullable — required for order-based MVP invoices; subscription-only drafts may omit once Sprint 9 creates them |

**Backfill:** Existing rows use `source_type = order` and `source_id = order_id`.

### Line items (`invoice_items`)

| **`line_item_type`** | `one_off_service` \| `subscription` \| `overage` \| `adjustment` (`App\Enums\InvoiceLineItemType`) |

Order-originated lines default to **`one_off_service`**. Draft line edits may set **`line_item_type`** via **`PUT /api/admin/invoices/{id}`** (`items[].line_item_type`).

---

## Idempotency & duplicate prevention

1. **Order-sourced invoices** — At most one **non-void** invoice per **`order_id`** (existing guard in **`CreateInvoiceFromOrderAction`**). **`source_type`/`source_id`** mirror the order for integrations.
2. **Subscription-sourced invoices** — Partial **unique index** (SQLite/PostgreSQL) on **`(source_type, source_id, billing_period_start, billing_period_end)`** where `source_type = company_subscription` and **`invoice_status != void`**. Voiding removes the row from the index predicate so a replacement bill can be created if commercial rules allow.
3. **Application guard** — **`SubscriptionInvoiceIdempotency::assertNoDuplicateSubscriptionPeriod`** must run before creating subscription invoices (same rule as DB, for clearer errors and MySQL environments without the partial index).

**Stripe / Xero (future):** When pushing invoices or payments to external systems, use **stable external keys** derived from **`invoices.id`** and/or **`source_type` + `source_id` + billing period** so retries and webhooks do not duplicate AR. Reconcile on **`stripe_payment_intent_id`** / Xero invoice id with **unique constraints** where supported (see **`docs/integrations/stripe.md`**).

---

## Sprint 9 — Subscription product

Planned capabilities (not in 7.7):

- **`GenerateSubscriptionInvoiceAction`** can generate **draft** subscription invoices when **`INVOICE_SUBSCRIPTION_GENERATION_ENABLED=true`**.
- Proration, plan changes, and **CRM subscription** UI tied to **`company_subscriptions`**.
- Optional: scheduled generation at period boundaries using the **same idempotency keys** above.

Manual generation workflow (Sprint 9.5):

1. Open a company in **Admin CRM** → **Subscription** tab.
2. Click **Generate subscription invoice draft**.
3. Confirm the **billing period start/end** (defaults to the active subscription `starts_at` / `renews_at`).
4. The API will either:
   - Create a new **draft** invoice (201), or
   - Return the existing non-void invoice for that same subscription + period (200).

Notes:

- Invoices are **never auto-sent** by this flow.
- Duplicate prevention uses both the **application guard** (`SubscriptionInvoiceIdempotency`) and a **DB unique index**.
- Safe retries are supported: call the endpoint again and it will return the existing invoice.

---

## Sprint 11 — Scheduler & queues

- Use **Laravel scheduler** (`schedule()`) and/or **queued jobs** to run “generate subscription invoices for period X” **once per tenant/period** with **idempotent** job design (e.g. unique job id: `subscription-bill:{subscription_id}:{period_start}`).
- Jobs should call **`SubscriptionInvoiceIdempotency`** before insert and rely on the **DB unique index** as a last line of defence.
- **Do not** enable wide cron without **`INVOICE_SUBSCRIPTION_GENERATION_ENABLED`** and tested reconciliation.

---

## Related

- **`docs/product/orders-invoices-payments.md`** — AR flows and permissions.
- **`docs/integrations/stripe.md`** — Webhook idempotency.
- **`config/invoices.php`** — **`subscription_invoice_generation_enabled`**.
