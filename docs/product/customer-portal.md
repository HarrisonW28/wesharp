# Customer portal (tenant workspace)

Venue-facing self-service flows run on **`/account/**`** Next.js routes, backed exclusively by Laravel **`middleware(['clerk.auth','tenant'])`** (`EnsureTenantCustomer`) grouped under **`/api/account/*`**.

Operations staff tooling remains on **`/api/admin/*`** guarded by **`EnsureInternalStaff`** — internal identities cannot authenticate tenant routes without failing the tenant middleware, and **`CustomerRouteGate`** rejects non-tenant browser sessions inside the SPA.

---

## Screens shipped (SPA)

| Route | Purpose |
| --- | --- |
| **`/account/dashboard`** | KPI snapshots (monthly fulfilment spend, unpaid invoice residues, throughput knives returned, incoming booking + completed order teaser). Numbers come purely from Laravel aggregates. |
| **`/account/bookings`** · **`/account/bookings/new`** · **`/account/bookings/[bookingId]`** | Tenant booking catalogue, creation wizard (damage + legal acknowledgements funnelled into Laravel notes footer), booking detail stripped of ops-only estimate/audit timelines. |
| **`/account/orders`** · **`/account/orders/[orderId]`** | Read-only fulfilment history + knife manifest rows (mirrors `OrderJson`). |
| **`/account/knives`** | Tag-level status table (summary JSON). |
| **`/account/invoices`** | AR list rows (`InvoiceJson::listRow`). |
| **`/account/locations`** | CRUD for `company_locations` rows (create + update) while protecting company scoping. |
| **`/account/settings`** | Display + update safe user/company fields (name, phone, billing inbox) — **no** status/slug/financial ledgers. |

Navigation items require explicit permission keys (see **Customer permissions** below).

---

## Customer permissions (`App\Support\Permissions`)

| Permission | Capability |
| --- | --- |
| `dashboard.view` | Loads portal shell dashboards. |
| `bookings.view` / `bookings.create` | Bookings list + wizard (owners retain `bookings.cancel`; staff tiers follow map). |
| `orders.view` | Completed order history/detail. |
| `knives.view` | Knife tag board. |
| `invoices.view` | Tenant invoice register. |
| `payments.view` *(optional UX)* | future payment timeline — still exposed through `/api/v1/me` permissions list even if SPA nav hides it. |
| **`account.locations.manage`** | Create/update `company_locations`. |
| **`account.settings.update`** | PATCH `/api/account/settings`. |

Owners retain **`knives.update`** for escalation flows; tenants never receive admin-only permissions such as **`companies.delete`**, **`invoices.update`**, or **`orders.update`**.

---

## Company scoping rules

1. **`EnsureTenantCustomer`** rejects unauthenticated callers, internal/staff JWTs (`CustomerRouteGate`), and orphaned users without **`company_id`**.  
2. Every query either injects **`where('company_id', $user->company_id)`** (lists) or invokes existing policies (**`BookingPolicy::view`** etc.) comparing **UUID equality** (`Permissions::userMayForCompany`).  
3. Tenant booking creation **forces** `Booking.company_id` from the JWT — request bodies cannot substitute another UUID. Internal estimate / route assignment fields (`internal_notes`, `price_estimate_pence`) stay **`null`** for portal-created rows.  
4. Location mutations require **`manageAccountLocations`** on the hydrated `Company` instance; IDs from other tenants 404 via explicit comparison guards.  

---

## Customer booking process (`POST /api/account/bookings`)

1. Validates **`location_id`** exists under the tenant **`company_locations`**.  
2. Persists **`service_type`** (`collection`/`onsite`), requested date (**must be after yesterday**), optional window + estimated blades, customer notes.  
3. Appends portal acknowledgement footer to notes after **`damage_acknowledged`** + **`terms_accepted`** both pass Laravel **`accepted`** rules (JSON booleans supported).  
4. Creates **`booking_status = requested`** with audit action **`booking.customer_portal_requested`**.  
5. Returns **`PortalBookingPayload::list`** (no internal quoting fields).

---

## API endpoints (`/api/account/*`)

| Method & path | Controller | Notes |
| --- | --- | --- |
| `GET /api/account/dashboard` | `AccountDashboardController@show` | Aggregated KPI payloads + helper copy explaining math. |
| `GET /api/account/bookings` | `AccountBookingController@index` | Paginates tenant bookings (`PortalBookingPayload::list`). |
| `POST /api/account/bookings` | `AccountBookingController@store` | See booking process section. |
| `GET /api/account/bookings/{booking}` | `AccountBookingController@show` | `PortalBookingPayload::detail` (no audits / internal quoting). |
| `GET /api/account/orders` | `AccountOrderController@index` | Forces `company_id` filter via duplicated request (`OrderService::paginate`). |
| `GET /api/account/orders/{order}` | `AccountOrderController@show` | `OrderJson` detail manifest. |
| `GET /api/account/knives` | `AccountKnifeController@index` | `KnifeService::paginate` scoped by query company id duplication. |
| `GET /api/account/invoices` | `AccountInvoiceController@index` | `InvoiceJson::listRow`. |
| `GET /api/account/locations` | `AccountLocationController@index` | `CompanyPolicy::view`. |
| `POST /api/account/locations` | `AccountLocationController@store` | `manageAccountLocations`. |
| `PUT /api/account/locations/{location}` | `AccountLocationController@update` | 404 if cross-company slug. |
| `GET /api/account/settings` | `AccountSettingsController@show` | Returns user + tenant metadata snapshot (read-only email + Clerk-bound fields). |
| `PUT /api/account/settings` | `AccountSettingsController@update` | Whitelisted keys only; invokes `UserPolicy::updateOwnBasicProfile` before mutating **`users.name`**. |

`GET /api/v1/account/smoke` remains for backwards-compat smoke probes.

---

## Financial calculation notes

- **Monthly spend KPI** sums **`orders.total_pence`** for **`order_status = completed`** within UTC month boundaries (**`updated_at`**).  
- **Outstanding balance KPI** mirrors Analytics’ invoice remainder query (total − summed `payments.amount_pence` for statuses outside Paid/Void).  
- **`total_knives_sharpened`** counts **`knives.knife_status ∈ {sharpened, quality_checked, returned}`**.

These calculations never occur on the client — the SPA renders returned integers/strings only using `formatGbpFromPence`.

---

## Known gaps / follow-ons

1. Stripe hosted invoice URLs + PDF pulls not exposed (placeholder copy on invoices UI).  
2. Booking cancellations + rescheduling not yet surfaced for tenants (still operations-owned).  
3. Route-level ETA / realtime telematics remain admin-only dashboards.  
4. Payment capture / card entry still finance-side — **`payments.manage`** untouched in portal MVP.  

See **`docs/testing/qa-checklist.md`** + **`docs/security/permissions-matrix.md`** for QA + matrix coverage.
