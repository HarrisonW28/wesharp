# Orders, invoices & payments — commercial stack

This document ties **kitchen orders** to **accounts receivable**: **`invoices`**, **`invoice_items`**, and **`payments`**. Operational order rollup (**`orders.payment_status`**) is server-owned; invoices expose a separate JSON **`payment_status`** rollup for UI (**not** persisted as a standalone column).

---

## Order ↔ invoice relationship

- Each **invoice** FKs **`company_id`** and **`order_id`** (one bill per order for MVP — **`CreateInvoiceFromOrderAction`** rejects a second invoice unless the existing one is **`void`**).

### Creating an invoice

**`POST /api/admin/invoices`** requires **`order_id`** (UUID). Optional **`issue_date`** and **`due_date`** override defaults. **`OrderPolicy::invoiceFromOrder`** requires **`invoices.create`** scoped to the order's **`company_id`**.

Order line items (or order totals fallback) supply **`invoice_items`** lines inside **`CreateInvoiceFromOrderAction`**.

### Draft invoice when completing an order

**`POST /api/admin/orders/{order}/complete`** accepts optional **`invoice_draft: true`**. When the actor passes **`OrderPolicy::invoiceFromOrder`**, the server creates a draft (or returns the existing non-void invoice metadata) via **`CreateInvoiceFromOrderAction`**. The admin order detail screen defaults this option on; users without invoice permission should untick it before completing.

### Updating draft / open invoices

**`PUT /api/admin/invoices/{invoice}`** accepts **`issue_date`** and **`due_date`** only (**`UpdateInvoiceRequest`**). Blocked when **`invoice_status`** is **`void`** or **`paid`**. Persisted columns remain **`issued_on`** / **`due_on`**.

---

## Screens (admin)

| Route | Purpose |
| --- | --- |
| **`/admin/invoices`** | Paginated invoice list (**`GET /api/admin/invoices`**), status / payment badges, overdue flag, **New invoice from order** (`order_id` → **`POST /api/admin/invoices`**). |
| **`/admin/invoices/[invoiceId]`** | Detail: line items, payment rows, actions — **Send** (placeholder), **Mark paid**, **Void**, **Manual bank payment** dialog (amount **`amount_pence`**, optional reference / paid_at). Links to company / order embeds where API exposes names. |
| **`/admin/payments`** | Payment history (**`GET /api/admin/payments`**) with company / invoice breadcrumbs in row. |
| **`/admin/finance`** | Finance dashboard — KPIs, overdue / draft tables, recent payments, top outstanding customers (**`GET /api/admin/finance/dashboard`**). Requires **`payments.view`** (and API also **`invoices.view`**). Hidden from **`route_manager`**. |

**Navigation:** **`src/config/navigation.ts`** — **Invoices** (`invoices.view`), **Payments** (`payments.view`).

Tenant **customer** users do **not** get **`/admin/*`** shells — **`staff`** middleware blocks non-internal accounts on **`/api/admin/*`**.

---

## API — admin invoices

All routes: **`clerk.auth`** + **`staff`**. Fine-grained checks via **`InvoicePolicy`** / **`OrderPolicy`** (create from order).

| Method | Path | Permission highlights |
| --- | --- | --- |
| **GET** | `/api/admin/invoices` | `invoices.view` |
| **POST** | `/api/admin/invoices` | Body: `order_id` (required), optional `issue_date`, `due_date` — **`CreateInvoiceFromOrderAction`**; **`OrderPolicy::invoiceFromOrder`** (**`invoices.create`** per company). |
| **GET** | `/api/admin/invoices/{invoice}` | `invoices.view` scoped to invoice **`company_id`**. |
| **PUT** | `/api/admin/invoices/{invoice}` | `invoices.update` — metadata / draft edits (**`UpdateInvoiceRequest`**). |
| **POST** | `/api/admin/invoices/{invoice}/send` | `invoices.update` — **`SendInvoicePlaceholderAction`** (audit only; no email integration). Draft → Sent. |
| **POST** | `/api/admin/invoices/{invoice}/mark-paid` | `invoices.update` **and** **`payments.view`** — **`MarkInvoicePaidAction`**. |
| **POST** | `/api/admin/invoices/{invoice}/void` | `invoices.update` — **`VoidInvoiceAction`** — blocked when already **Paid**. |

### Invoice JSON shape (API naming)

 persisted columns use **`issued_on`** / **`due_on`**; JSON uses:

| JSON field | Source |
| --- | --- |
| **`issue_date`**, **`due_date`** | `Y-m-d` from `issued_on` / `due_on` |
| **`subtotal`**, **`tax_total`**, **`total`** | Pence integers (`subtotal_pence`, `tax_pence`, `total_pence`) |
| **`status`** | `InvoiceStatus` value |
| **`payment_status`** | **`InvoiceRollup::paymentStatus`** — `unpaid` \| `partial` \| `paid` \| `void` (not client-writable) |
| **`overdue`** | boolean — past due + Sent/Overdue (see **`InvoiceRollup::isPastDue`**) |

Detail adds **`items[]`** and nested **`payments[]`** summaries.

---

## API — admin payments

| Method | Path | Notes |
| --- | --- | --- |
| **GET** | `/api/admin/payments` | Paginated; **`PaymentJson::detail`** rows. `payments.view`. |
| **POST** | `/api/admin/payments/manual` | **`RecordManualPaymentRequest`**: `invoice_id`, `amount_pence`, `payment_method`, optional `reference`, `paid_at`. **`InvoicePolicy::recordManualPayment`** ⇒ **`payments.manage`** + scoped **`invoices.view`**. Server enforces balance / override rules (see below). |
| **POST** | `/api/admin/invoices/{invoice}/stripe-checkout-session` | **`payments.manage`** + **`recordManualPayment`** scope. Placeholder: returns hosted-checkout **availability metadata** only (no Stripe Session URL yet). |

**Stripe foundation:** env vars, webhook idempotency, and PSP abstraction — **`docs/integrations/stripe.md`**. Invoice detail JSON includes a **`stripe`** block for admin UI; customer portal **`payment`** CTA stays generic until a real checkout URL exists.

**Finance dashboard:** **`GET /api/admin/finance/dashboard`** — query params **`date_from`**, **`date_to`**, **`company_id`**, **`invoice_status`**. Outstanding / unpaid / overdue / drafts are **snapshots**; paid totals and void-in-period respect the date range. Subscription card uses **real** payments on **`is_subscription_billing`** invoices and **subscription renewal dates** from **`company_subscriptions`** (not modelled MRR).

**Recurring / subscription invoices (foundation):** Invoices can carry **`source_type`**, **`source_id`**, **`billing_period_start` / `billing_period_end`**, and line **`line_item_type`** (`one_off_service`, `subscription`, `overage`, `adjustment`). Duplicate subscription-period bills are prevented by DB + app rules; automatic generation stays off until Sprint 9/11. See **`docs/product/subscription-invoices.md`**.

---

## Invoice lifecycle (MVP)

1. **Draft** — created via **`POST /api/admin/invoices`** with an **`order_id`**.
2. **Sent** — **`POST …/send`** placeholder (audit **`invoice.send_placeholder`**); real email out of scope.
3. **Paid** — **`POST …/mark-paid`** and/or sufficient **payment** rows; may create a top-up **`Payment`** with method **Manual** if received &lt; total (**`MarkInvoicePaidAction`**). Order **`payment_status`** → **Paid** when invoice settles.
4. **Overdue** — may be represented in data / UI via **`InvoiceRollup`** + due date vs today (cron to flip `invoice_status` is a **known gap**).
5. **Void** — **`POST …/void`** if not Paid (**`invoice.void`** audit).

---

## Payment lifecycle (MVP)

- **Manual recording** — **`POST /api/admin/payments/manual`** → **`payment.recorded.manual`** audit on the **`payments`** row.
- **Ledger status** — Each **`payments.payment_status`** row reflects **`PartPaid`** / **`Paid`** from server rules; client must not spoof status columns.
- **Overpayments** — Amount above remaining balance requires **`payments.override`**; otherwise **422**.

---

## Manual payment rules (server)

1. Void invoice → **422** (no payment).
2. Incoming amount &gt; remaining balance → **422** unless actor has **`payments.override`**.
3. When cumulative payments ≥ invoice total and invoice not void/paid → invoice → **Paid**, order **`payment_status`** → **Paid** (inside DB transaction in **`RecordManualPaymentAction`**).
4. All successful manual posts emit **`audit_logs`** with action **`payment.recorded.manual`**.

---

## Audit actions (finance trail)

| Action | Model | When |
| --- | --- | --- |
| `invoice.created_from_order` | Invoice | **`CreateInvoiceFromOrderAction`** |
| `invoice.updated_meta` | Invoice | **`InvoiceController::update`** |
| `invoice.send_placeholder` | Invoice | **`SendInvoicePlaceholderAction`** |
| `invoice.marked_paid` | Invoice | **`MarkInvoicePaidAction`** |
| `invoice.void` | Invoice | **`VoidInvoiceAction`** |
| `payment.recorded.manual` | Payment | **`RecordManualPaymentAction`** |

---

## Known gaps

- **Email / PDF**: **Send invoice** is a placeholder (audit-only).
- **Server PDF**: No generated PDF asset or download endpoint yet — customers and admins use **browser print → Save as PDF**. A future sprint may add server-side PDF (e.g. Dompdf / Browsershot) if required for email attachment workflows.
- **Overdue cron**: **`invoice_status`** may not auto-transition to **`overdue`** without scheduled work.
- **PSP webhooks**: Stripe webhook route verifies signatures and stores **`evt_*`** idempotently; **payment settlement from Stripe events is not implemented** — **`PaymentMethod::Stripe`** reserved for webhook-created rows later.
- **Customer portal**: No dedicated PDF download in this MVP (print only).

---

## Related docs

- **Admin CRM subscription panel (readiness, no MRR):** `docs/product/admin-crm.md` — uses **`invoices.is_subscription_billing`** for latest/outstanding subscription billing context; full subscription lifecycle is **Sprint 9**.
- **Enums & workflow tables:** `docs/product/status-workflows.md`
- **Security / permissions:** `docs/security/security-model.md`, `docs/security/permissions-matrix.md`
- **Data model:** `docs/architecture/data-model.md`
- **Backend / frontend wiring:** `docs/architecture/backend-architecture.md`, `docs/architecture/frontend-architecture.md`
