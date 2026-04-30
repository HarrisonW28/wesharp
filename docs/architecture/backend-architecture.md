# Backend architecture (WeSharp Laravel app)

Implementation root: `**apps/backend**` (Laravel **13.x**, PHP **8.3** per Composer constraint).

---

## Layout (updated for auth MVP)

| Area | Responsibility |
| --- | --- |
| `routes/api.php` | `GET /api/health`; versioned JWT surface under `**/api/v1/**` guarded by Clerk middleware stacks. |
| `app/Services/Clerk/**` | `ClerkJwtVerifier` + `ClerkUserSynchronizer`. |
| `app/Http/Middleware/AuthenticateClerkJwt.php` | Bearer auth + `Auth::guard('web')->setUser(...)`. Additional aliases documented in §Middleware. |
| `app/Support/Permissions.php` | Central permission map + helpers (`userMay`, `userMayForCompany`). |
| `app/Policies/CompanyPolicy.php` | Example tenant-scoped policy delegating to `Permissions`. |
| `app/Services/UserRoleService.php` | Audited role updates (`settings.manage` prerequisite). |
| `config/clerk.php` | Clerk issuer/JWKS/bypass toggles. |
| `config/cors.php` | Published CORS configuration for browser clients (default `allowed_origins: *` for local dev). |
| `database/migrations/*` | `users` includes `clerk_user_id`, `role`, `company_id`, `status`; `audit_logs.subject_user_id` & widened `auditable_id` for polymorphic bigint users. |

---

## Admin CRM API (internal)

| Route group | Middleware | Notes |
| --- | --- | --- |
| **`/api/admin/companies`…** | `clerk.auth`, `staff` | Thin **`App\Http\Controllers\Admin\CompanyController`**: index via **`BuildCompaniesIndexQuery`**, CRUD + nested sub-resources. |
| Form requests | — | `StoreCompanyRequest`, `UpdateCompanyRequest`, `UpdateCompanyStatusRequest`, `StoreCompanyNoteRequest`, `StoreContactRequest`, `StoreCompanyLocationRequest`, `StoreCompanyBookingRequest`. |
| Policy | — | **`CompanyPolicy`** → **`Permissions::`** (`companies.*`, `userMayForCompany`). |
| Resources | — | `CompanyResource`, `CompanyDetailResource`, `CompanySummaryResource`. |
| Audit | — | **`App\Services\Audit\AuditRecorder`** on mutations (create/update/delete/status/notes/contacts/locations/bookings). |

Implementation files: `routes/api.php`, controller + actions + requests + resources under `app/Http`.

---

## Admin bookings API (internal)

| Route group | Middleware | Notes |
| --- | --- | --- |
| **`/api/admin/bookings`…** | `clerk.auth`, `staff` | Thin **`BookingController`**, index via **`BuildBookingsIndexQuery`**; **`StoreBookingRequest`**, **`UpdateBookingRequest`**, **`AssignBookingToRouteRequest`**. |
| Lifecycle actions | — | **`ConfirmBookingAction`**, **`CancelBookingAction`**, **`AssignBookingToRouteAction`**, **`ConvertBookingToOrderAction`** — transitions enforced via **`BookingStatusTransitions`**; statuses not mass-assigned in `PUT`. |
| Policy | — | **`BookingPolicy`** (`view`, `update`, `cancel`, `assignRoute`, `convertToOrder`) → `Permissions`. |
| Resources | — | **`BookingResource`**, **`BookingDetailResource`** (timeline from `audit_logs`). |
| Routes manager | — | **`RouteController`** + **`RouteStopController`**: `GET /api/admin/routes` (picker-compatible when **no** `page`/`per_page`/`paginate` — `{ data: { items } }`; paginated variant with query params); `GET /api/admin/routes/today`; full CRUD + lifecycle endpoints under **`/api/admin/routes`** and **`/api/admin/route-stops`** (see **`docs/product/route-manager.md`**). |
| Audit | — | Lifecycle + `booking.created` / `booking.updated` payloads. |

---

## Orders & knives (operations)

| Route group | Middleware | Notes |
| --- | --- | --- |
| **`/api/admin/orders`** | `clerk.auth`, `staff` | Thin **`OrderController`** → **`OrderService`** for list/detail/create/update, **`CompleteOrderAction`** for completion after policy check. Knife manifest endpoints **`POST …/add-knife`**, **`POST …/bulk-add-knives`** wrap **`KnifeService`** + tagging inside DB transactions where multi-step totals change. |
| **`/api/admin/knives`** | `clerk.auth`, `staff` | Thin **`KnifeController`** → **`KnifeService`** for paging + attribute **`PUT`**; standalone **`POST`** (requires `order_id`) adds a knife via **`OrderService::addKnife`** after **`manipulateKnives`** on the parent order. |
| Lifecycle actions | — | **`MarkKnifeInspectedAction`**, **`Sharpened`**, **`QualityChecked`**, **`Returned`**, **`ReportKnifeIssueAction`** (`App\Actions\Knives\*`) delegate to **`MarkKnifeTrait`** which calls **`KnifeStatusTransitions::assertCan`** inside a **`DB::transaction`**, **`AuditRecorder::record`** on every transition. |
| Policy | — | **`OrderPolicy`** (**`orders.view`**, **`orders.create`**, **`orders.update`**; **`manipulateKnives`** ⇒ **`knives.update` ∧ `orders.update`** per-company); **`KnifePolicy`** (**`knives.view`**, **`knives.update`**, **`transition`**). |
| JSON | — | **`OrderJson`**, **`KnifeJson`** — knife detail exposes **`timeline`** from **`audit_logs`** (`auditable_type = Knife`). |

Implementation files: `routes/api.php` (prefix **`/api/admin`**), controllers under `App\Http\Controllers\Admin`, services under `App\Services\Orders`, `App\Services\Knives`, transitions under `App\Support\Knives`, `App\Support\Orders`.

---

## Admin invoices & payments (AR)

| Route group | Middleware | Notes |
| --- | --- | --- |
| **`/api/admin/invoices*`** | `clerk.auth`, `staff` | Thin **`InvoiceController`**: **`index`/`show`** via **`InvoiceService`**, **`store`** (**`StoreInvoiceRequest`**) → **`CreateInvoiceFromOrderAction`** + **`OrderPolicy::invoiceFromOrder`**; **`update`** (**`UpdateInvoiceRequest`**) edits draft metadata; **`send`/`mark-paid`/`void`** delegate to **`SendInvoicePlaceholderAction`**, **`MarkInvoicePaidAction`**, **`VoidInvoiceAction`**. JSON via **`InvoiceJson`** (**`InvoiceRollup`** for **`payment_status`/`overdue`**). |
| **`/api/admin/payments*`** | `clerk.auth`, `staff` | Thin **`PaymentController`**: **`index`** → **`PaymentService`** + **`PaymentJson::detail`**; **`POST …/payments/manual`** → **`RecordManualPaymentRequest`** → **`InvoicePolicy::recordManualPayment`** → **`RecordManualPaymentAction`** (DB transaction, audit **`payment.recorded.manual`**). |

| Policy | Enforces |
| --- | --- || **`InvoicePolicy`** | `invoices.view` / `create` / `update`; **`send`/`markPaid`/`voidInvoice`** combos; **`recordManualPayment`** = **`payments.manage`** + **`invoices.view`** for company. **`markPaid`** also requires **`payments.view`**. |

Implementation: `App\Actions\Invoices\*`, `App\Actions\Payments\RecordManualPaymentAction`, `App\Services\Invoices\InvoiceService`, `App\Services\Payments\PaymentService`, `App\Support\Invoices\InvoiceRollup`.

---
## Persistence & audit

- `users.clerk_user_id` links Clerk JWT `sub`; nullable for legacy seeded accounts.
- `subject_user_id` captures explicit audit targets alongside polymorphic pairing for domain rows logged as UUID IDs.
- `Payment` override workflows must continue to funnel through audited services capturing actor + payloads.

---

## How this doc stays accurate

Refresh when:

1. Middleware aliases / route groups mutate.
2. New policies or Permissions constants appear.
3. Clerk verification steps or env expectations change materially.
