# Security model — MVP snapshot

Aligned with Laravel `App\Support\Permissions` + `CompanyPolicy` scaffolding + middleware aliases registered in `bootstrap/app.php`.

---

## Principles

1. **SSR + API symmetry** — Middleware stack authenticates JWTs BEFORE routing to controllers (`clerk.auth`).
2. **Server-side RBAC truth** — `users.role`, `permissions` snapshots from `/api/v1/me` are illustrative for UI only.
3. **Tenant isolation** — Every customer-visible row must funnel through `$user->company_id` predicates or policy helpers referencing `Permissions::userMayForCompany()`.
4. **Audit accountability** — High-risk workflows (role assignment, payment overrides) flow through services that append `audit_logs` rows with `subject_user_id` references.
5. **Safe API errors** — `AuthenticationException` / `AuthorizationException` render `ApiResponses::{unauthorized,forbidden}` JSON — no stack traces in production.

---

## Role catalog

| Role | Buckets | Notes |
| --- | --- | --- |
| `super_admin` | internal | Full matrix |
| `admin` | internal | Same as `super_admin` for MVP (tighten later) |
| `route_manager` | internal | Logistics slice; limited finance |
| `finance` | internal | AP/AR, payments, disputes |
| `customer_owner` | tenant | Company admin with scoped write |
| `customer_staff` | tenant | Kitchen staff with narrower edit rights |

---

## Middleware → route patterns

Existing examples:

```
GET /api/v1/me            → clerk.auth
GET /api/v1/admin/smoke   → clerk.auth + staff
GET /api/v1/account/smoke → clerk.auth + tenant
GET /api/account/dashboard → clerk.auth + tenant
```

Internal-only collections stay under **`/api/admin/*`** with explicit **`staff`** — tenant identities **cannot** step into those controllers even with guessed UUIDs because policies + queries both require internal roles.

---

## Payment override workflow

 Overrides (write-offs/refunds exceeding automated tolerances): require **`payments.manage` + elevated approval** enforced by Laravel services (feature flags + dual logging). Frontend labels must not authorize alone.

**Manual invoice payments:** **`POST /api/admin/payments/manual`** authorises **`InvoicePolicy::recordManualPayment`** (**`payments.manage`** + scoped **`invoices.view`**). Posting **`amount_pence`** above the unpaid remainder (or recording when the invoice is already **paid**) requires **`payments.override`**, which is granted only to **`super_admin`** / **`admin`** (**`RecordManualPaymentAction`**).

---

## Admin invoicing & payments

1. **`staff`** + **`permission:invoices.*` / `payments.*`** middleware on **`/api/admin/invoices*`** and **`/api/admin/payments*`** ensures only internal users with finance-capable grants hit AR endpoints (belt before controller **`authorize()`** calls).
2. **Settlement authority** lives in **`MarkInvoicePaidAction`**, **`RecordManualPaymentAction`**, **`VoidInvoiceAction`**, and **`InvoiceService::update`** — not request bodies asserting paid/void externally.
3. **Audit hooks** record **`invoice.*`** and **`payment.recorded.manual`** via **`AuditRecorder`** (listed in **`docs/product/orders-invoices-payments.md`**).

---

## Customer company scoping

1. Middleware `tenant` aborts tenant routes if `company_id` empty.
2. Policies call `Permissions::userMayForCompany()` with model ids.
3. Query builders should default `where company_id = $user->company_id` for controllers serving tenant dashboards (future scaffolding).
4. **`/api/account/*`** routes add **`EnsurePermission`** per verb — examples: **`permission:dashboard.view`** on **`GET /api/account/dashboard`**, **`permission:bookings.create`** on **`POST /api/account/bookings`**, **`permission:account.locations.manage`** on location mutations. Policies still enforce **`userMayForCompany`** for row access.

---

## Admin permission belt (`/api/admin/*`)

1. **`clerk.auth`** + **`staff`** remain the outer gate (`EnsureInternalStaff`).
2. Sensitive collections add **`EnsurePermission`** on the route — e.g. **`permission:invoices.view`** for invoice reads, **`permission:invoices.update`** for **`send` / `mark-paid` / `void`**, **`permission:payments.view`** / **`payments.manage`** for **`GET /payments`** and **`POST /payments/manual`**, **`permission:routes.manage`** for **`POST /api/admin/routes`** and reorder/stop-insertion (not **`start` / `complete`** — those stay policy-only so assigned drivers without **`routes.manage`** can still operate when policy allows).

---

## Public booking enquiries (`/api/public/*`)

1. **`POST /api/public/booking-enquiries`** is **unauthenticated** by design — it must never trust role headers from the client; validation + business rules live in **`StorePublicBookingEnquiryRequest`** and **`CreatePublicBookingEnquiryAction`**.
2. **Rate limiting** — **`throttle:booking-enquiries`** caps abuse (**10/min/IP**); **429** is expected when exceeded.
3. **Response shape** — success returns only **`accepted`** + a friendly **`message`** (no CRM/booking IDs) to reduce enumeration and scraping value.
4. **Audit** — events are recorded with **null actor**; treat as **`system`/anonymous** attribution in reporting.

---

## Stripe webhooks

**`POST /api/webhooks/stripe`** is **unauthenticated**; **`StripeWebhookSignature`** verifies **`Stripe-Signature`** using **`config('stripe.webhook_secret')`** (see **`docs/security/stripe-security.md`** and **`docs/integrations/stripe.md`**). Missing secret ⇒ **503** with safe JSON (**no raw provider errors** in production wrappers).

---

## Production error sanitisation (`/api/*`)

When **`APP_DEBUG=false`**, Throwables not mapped to **`HttpException`** (after auth/validation/authorisation renders) resolve to **`ApiResponses::error`** with code **`server_error`** — generic copy only, **no exception message or trace** in the JSON body.

---

## Security MVP checks completed (snapshot)

| Area | Status |
| --- | --- |
| Admin authenticated (`clerk.auth` + `staff`) | ✅ |
| Tenant authenticated (`clerk.auth` + `tenant` + scoped policies) | ✅ |
| Public booking + Stripe webhook intentionally anonymous | ✅ |
| Finance vs route-manager separation (payments vs route manifests) | ✅ route + policy |
| Tenant cross-company read blocked | ✅ policy + **`TenantCompanyIsolationTest`** |
| Rate limit public enquiry | ✅ |
| Stripe signature verification scaffold | ✅ |
| Attachment validation helper for future multipart routes | ✅ **`ValidatedAttachmentRules`** |
| Laravel **FormRequest** base import fixed for Laravel 13 (`Illuminate\Foundation\Http\FormRequest`) on invoice/manual payment requests | ✅ |
