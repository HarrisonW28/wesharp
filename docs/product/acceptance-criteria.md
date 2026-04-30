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
