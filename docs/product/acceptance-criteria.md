# Acceptance criteria — Admin CRM & bookings MVP

Criteria below assume Clerk auth, internal **`staff`** middleware, and permissions seeded for the tester.

## Accounts list (`/admin/crm`)

- [ ] Loads companies from **`GET /api/admin/companies`** with default query params (`page`, `per_page`, `sort`, `direction`) applied via URL sync.
- [ ] Search (`q`), city (`city`), and status (`status`) update the URL and reload the dataset; pagination resets when filters change.
- [ ] Table shows account name (link), city, status badge, total spend (GBP from pence), last booking date.
- [ ] Previous / Next obey `meta.pagination`; empty state renders when zero rows after filters.
- [ ] Loading and error banners render distinct states.
- [ ] **New account** modal validates required name (`zod`), POST **`/api/admin/companies`** on success; success toast invalidates list.
- [ ] Rows link to **`/admin/crm/{id}`**.

## Customer profile (`/admin/crm/[companyId]`)

- [ ] Parallel fetch: **`GET /api/admin/companies/{id}`**, **`GET .../summary`**, **`GET .../activity`**; malformed payloads produce an error banner.
- [ ] KPI cards mirror summary resource (orders revenue, pipeline count, contacts/locations counts, open invoice count + monetary total).
- [ ] Sections render even when nested arrays are empty (“No bookings.” etc.).
- [ ] Notes: staff with `companies.update` can POST a note via **`POST .../notes`**; list updates after invalidate.
- [ ] Contacts / locations modals POST to **`POST .../contacts`** and **`POST .../locations`**; tables refresh afterward.
- [ ] Booking dialog requires **`bookings.create`** and at least one location; POST **`POST .../bookings`** with `company_location_id`, `scheduled_date`, `service_type` (`collection` \| `onsite`).
- [ ] Quick status buttons call **`PUT .../status`** `{ company_status }` for active / at risk / lost (disabled when redundant or lacking `companies.update`).
- [ ] “Request review” only shows **toast** acknowledgement (integration not wired).
- [ ] Embed tables list bookings / orders / knives / invoices with stable columns consistent with Laravel resources.

## Bookings (`/admin/bookings`)

- [ ] List loads **`GET /api/admin/bookings`** with URL-synced **`status`, `city`, `date`, `service_type`** + pagination + **`sort`** (`requested_date`, `status`, `city`, `created_at`).
- [ ] **Create booking** validates with Zod, POST **`POST /api/admin/bookings`**, redirects to detailed screen on success toast.
- [ ] Detail uses **`BookingDetailResource`**: timeline, cards, routing summary, toast feedback on mutations.
- [ ] Lifecycle buttons call **`/confirm`, `/cancel`, `/assign-route`, `/convert-to-order`** respecting permissions (**`routes.manage`** for assignment, **`orders.create`** for conversion).

## Auditing

- [ ] Backend records audit entries on create/update/delete/status/note/contact/location/booking actions (see `AuditRecorder` calls in controllers).

## Route Manager (`apps/frontend/(route-manager)/admin/routes`)

- [ ] **`/admin/routes/today`** consumes **`GET /api/admin/routes/today`**; metrics + cards render; **`Start route`** succeeds when **`route_status === scheduled`**; query cache invalidates.
- [ ] **`/admin/routes`** uses **`paginate`** query variant; paging links preserve state; rows navigate to **`/admin/routes/{uuid}`**.
- [ ] **`/admin/routes/[routeId]`** shows **`progress`** bar + notes + **`Complete route`** when **`in_progress`**.
- [ ] **`/admin/routes/.../stops/[stopId]`** shows contact + workflow buttons; **`PUT`** saves knife counts / damage strings; **`tel:` / Google Maps links** behave on device.
- [ ] Route Manager layout omits **`AdminShell`** sidebar (**`StaffRouteGate`** only).
- [ ] **`src/app/manifest.ts`** publishes web app manifest; **`/offline`** placeholder reachable.

## Orders (`/admin/orders`)

- [ ] List loads **`GET /api/admin/orders`** with URL-synced pagination; **loading**, **empty**, and **error + Retry** are distinct UI states (not only toasts).

## Orders — create

- [ ] **New order** validates UUIDs (**`company_id`**, **`booking_id`**) ; **`POST /api/admin/orders`** succeeds; toast + redirect **`/admin/orders/{id}`** on happy path.

## Order detail (`/admin/orders/[orderId]`)

- [ ] Loads **`GET /api/admin/orders/{id}`**; shows commercial totals (**`*_pence`** fields mirror API).
- [ ] **Add one knife**, **Bulk add knives** call **`POST …/add-knife`**, **`POST …/bulk-add-knives`**; manifests refresh (**`knives`** / **`knife_count`**).
- [ ] **Complete order** invokes **`POST …/complete`** when policy allows (**`completed`** disables button).

## Knives (`/admin/knives`)

- [ ] **`GET /api/admin/knives`** with filters **`tag_id`**, **`q`**, **`status`**, **`company_id`**, **`order_id`** wired from filter panel (**Apply**) + pagination preserves query string.

## Knife detail (`/admin/knives/[knifeId]`)

- [ ] Loads knife detail (**`KnifeDetailResponseSchema`**); workflow buttons gated by transition graph mirrored in **`knife-status-workflow.ts`** vs backend **`KnifeStatusTransitions`**.
- [ ] **`POST`** transition failures surface **toast error** (**422**) after server round-trip.
- [ ] **Report issue** requires **`damage_notes`**; **`timeline`** renders **`audit_logs`** for **`App\Models\Knife`**.

## Invoices (`/admin/invoices`)

- [ ] **`GET /api/admin/invoices`** fills the table + pagination; **Overdue**, **Invoice status**, and **Payment (rollup)** columns align with JSON **`overdue`**, **`status`**, **`payment_status`** (**not** trusted from UI-only logic).
- [ ] **New invoice** posts **`order_id`** (**`POST /api/admin/invoices`**) ; duplicate invoices for same order (**non-void**) fail with actionable error toast / message.

## Invoice detail (`/admin/invoices/[invoiceId]`)

- [ ] Loads **`GET /api/admin/invoices/{id}`**; **Line items** and **Payments** tables render API arrays.
- [ ] Actions: **Send** (**`POST …/send`** placeholder), **Mark paid**, **Void**, **Manual bank payment** (**`POST /api/admin/payments/manual`** with **`invoice_id`** + **`amount_pence`**) behave per policy (**403**/ **422** on misuse).

## Payments (`/admin/payments`)

- [ ] **`GET /api/admin/payments`** list renders (**`payments.view`**).


## Analytics (`/admin/analytics`)

- [ ] Parallels **`GET /api/admin/analytics/overview`**, **`/sales`**, **`/routes`**, **`/operations`** with URL **`date_from`**, **`date_to`**, optional **`city`** (defaults last 90 days when missing via client redirect).
- [ ] KPI cards display **formatted GBP strings** derived only from **`kpis.*_pence`** fields — no client-side derivation of aggregates.
- [ ] Recharts areas/bars respond to ResizeObserver breakpoints via **`ResponsiveContainer`**; **`loading`** + **retry error** banners render for failed queries.
- [ ] Charts show **empty** copy when the returned series arrays are zero-length (**may occur for sparse route KPIs**).
- [ ] **403** from API when JWT lacks **`analytics.view`** (**forbidden banner** gate).

## Customer portal (`/account/*`)

- [ ] **`TenantRouteGate`** + Laravel **`EnsureTenantCustomer`** symmetry — internal staff JWT cannot render tenant shell (redirect **`/forbidden`** / API **`403`**).
- [ ] Dashboard KPI formatting pulls only from Laravel integers (`**/api/account/dashboard`**) via **`kpis`** — SPA never fabricates aggregates.
- [ ] **`POST /api/account/bookings`** binds **`company_id`** from JWT (`location_id` must belong to tenant); acknowledgements (**`damage_acknowledged`**, **`terms_accepted`**) enforced.
- [ ] Sanity curl: **`GET /api/admin/orders`** with tenant token stays **403** (proves **`staff`** fence).
- [ ] Locations **`POST`/`PUT /api/account/locations`** cannot modify another company’s **`company_locations`** row (expect **404/403** on cross-tenant UUID guessing).
- [ ] **`PUT /api/account/settings`** limited to **`user.name`** + **`company.{name,phone,billing_email}`** (slug / AR fields remain read-only in UI).

## Public enquiry (`/` + `/book`)

- [ ] **`/book`** uses Zod (`PUBLIC_BOOKING_ENQUIRY_SCHEMA`) aligned with Laravel **`StorePublicBookingEnquiryRequest`**; accessible labels **`htmlFor` / `id`** and **`aria-invalid`** wired for errors.
- [ ] **`POST /api/public/booking-enquiries`** succeeds without Bearer token when payload is valid and **`terms_accepted`** is accepted; **`201`** returns **`data.accepted`** + **`message`** only (no internal IDs).
- [ ] Repeated rapid submits from one IP exceed limit → **`429`** (throttle **`booking-enquiries`**).
- [ ] Laravel creates **`CompanyStatus::Lead`** when email does not match an existing **`billing_email`** / contact email; **`CompanyLocation`**, **`Contact`**, **`BookingStatus::Requested`**, CRM **note**, and **audit** rows (`public.booking_enquiry`, `booking.created_from_public_enquiry`) are recorded (see **`docs/product/public-website.md`**).
