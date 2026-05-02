# Permission matrix (Laravel)

**Source of truth:** `App\Support\Permissions` — role → permission list and helpers `userMay` / `userMayForCompany`.

**Rule:** The browser only hides navigation; **every** tenant and staff API call is authorized via JWT (`clerk.auth`), segment middleware (`staff` / `tenant`), optional `permission:{key}`, and **policies** for resource and company scope.

---

## Roles

| Role | Internal | Notes |
| --- | --- | --- |
| `super_admin` | Yes | All permissions. |
| `admin` | Yes | All permissions. |
| `route_manager` | Yes | Operations + routes/stops (scoped to assigned driver routes in policies). |
| `finance` | Yes | Finance, invoices, payments, subscription billing, **finance** reports — **no** `routes.*` / `route_stops.update`. |
| `customer_owner` | No | Tenant portal; company-scoped. |
| `customer_staff` | No | Tenant portal; slightly narrower than owner (e.g. locations/business). |

---

## API surface (high level)

| Prefix | Auth | Segment | Permission belt |
| --- | --- | --- | --- |
| `/api/health` | None | — | Public. |
| `/api/public/*` | None | — | Throttled (e.g. booking enquiries). |
| `/api/webhooks/clerk`, `/api/webhooks/stripe` | None | — | Signature verification + throttled; safe JSON when misconfigured (no secrets in body when `APP_DEBUG=false`). |
| `/api/account/*` | Clerk JWT | `tenant` | Per-route `permission:*` + policies (`company_id`). |
| `/api/v1/me`, `POST …/account/bootstrap-organisation` | Clerk JWT | — | Throttled bootstrap. |
| `/api/v1/admin/smoke`, `/api/v1/account/smoke` | Clerk JWT | `staff` / `tenant` | **Non-production only** (omitted when `APP_ENV=production`). |
| `/api/admin/*` | Clerk JWT | `staff` | Per-route `permission:*` + policies. |

---

## Customer data isolation

- Tenant users: `EnsureTenantCustomer` + `Permissions::userMayForCompany` and model policies (e.g. orders/bookings belong to `company_id`).
- Evidence photos / portal updates: visibility and `EvidencePhotoPolicy` / `CustomerPortalUpdatePolicy` gate customer vs staff paths.
- Streaming files: `AccountOrderEvidencePhotoController` authorizes order + photo association before `Storage::response` (private cache headers).

---

## Hardening notes (Sprint 12.5)

- **Route execution:** `POST …/routes/{route}/start|complete`, route-stop transitions, stop-level evidence upload, and stop-level customer portal updates use explicit `permission:routes.view` / `permission:route_stops.update` in addition to policies.
- **Errors:** With `APP_DEBUG=false`, unhandled non-HTTP exceptions on `/api/*` return a generic JSON error; `abort(5xx, …)` messages for HTTP exceptions are likewise generic on `/api/*`. Webhook controllers avoid echoing signing-secret diagnostics when not debugging.
- **CORS:** Configure `FRONTEND_ORIGIN` or `CORS_ALLOWED_ORIGINS` in production so `config/cors.php` does not fall back to `*`.
- **Abuse:** Provider webhooks use named rate limiting (`provider-webhooks` in `AppServiceProvider`).
- **Production (12.6+):** `DatabaseSeeder` skips demo fixtures when `APP_ENV=production`; JWT smoke routes under `/api/v1/…/smoke` are not registered in production.

For Clerk JWT and middleware aliases, see [auth-sso.md](./auth-sso.md).
