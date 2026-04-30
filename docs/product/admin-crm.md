# Admin CRM (MVP)

## Purpose

Operational CRM for internal staff: browse **companies (accounts)**, filter and sort the list, open a **customer profile**, and run day-to-day actions (notes, contacts, locations, status, booking requests) against the Laravel API. Data is sourced from the seeded domain model (`companies`, `contacts`, `company_locations`, `bookings`, `orders`, `knives`, `invoices`, `notes`, `audit_logs`).

## Screens built

| Route | Description |
| --- | --- |
| `/admin/crm` | List: search, city + status filters, sort (name, total spend, last booking, city), pagination, DataTable, “New account” modal (POST create). Status badges. |
| `/admin/crm/[companyId]` | Profile: summary KPIs (from `/summary`), contacts, locations, notes + add note, merged **activity** timeline (audits + notes), bookings/orders/knives/invoices tables, quick status buttons, dialogs for contact, location, booking; “Request review” placeholder toast. |

## API endpoints built (backend)

Base path: **`/api/admin`** (Laravel `routes/api.php`; full URL prefix **`/api/admin/...`**).

| Method | Path | Role |
| --- | --- | --- |
| GET | `/companies` | Index with search, filters, sort, pagination |
| POST | `/companies` | Create company |
| GET | `/companies/{company}` | Detail (`CompanyDetailResource`) |
| PUT | `/companies/{company}` | Update |
| DELETE | `/companies/{company}` | Soft delete flow + audit |
| GET | `/companies/{company}/summary` | KPI blob (`CompanySummaryResource`) |
| GET | `/companies/{company}/activity` | Audit + notes merged timeline |
| POST | `/companies/{company}/notes` | Add note |
| POST | `/companies/{company}/contacts` | Add contact |
| POST | `/companies/{company}/locations` | Add location |
| POST | `/companies/{company}/bookings` | Create booking (requires `bookings.create` in addition to company auth) |
| PUT | `/companies/{company}/status` | Update `company_status` only |

Middleware: **`clerk.auth`**, **`staff`**. Responses use **`App\Support\ApiResponses`**.

### Search / filter / sort (index)

- **`q`** — search across name/slug/email (implemented in `App\Actions\Companies\BuildCompaniesIndexQuery`; align with backend for exact columns).
- **`city`** — exact match on company city (when provided).
- **`status`** / **`company_status`** — filter by `CompanyStatus` enum.
- **`sort`** — `name`, `total_spend`, `last_booking`, `city` (per `BuildCompaniesIndexQuery`).
- **`direction`** — `asc` / `desc`.
- **`page`**, **`per_page`** — capped per controller (max 50).

## Permissions required

| Capability | Permission constant | Notes |
| --- | --- | --- |
| List / view profile / summary / activity | `companies.view` | `CompanyPolicy::viewAny` / `view` (+ `userMayForCompany` for scoped view) |
| Create account | `companies.create` | POST `/companies` |
| Notes, contacts, locations, PUT company | `companies.update` | Mutations under `update` policy |
| Delete company | `companies.delete` | DELETE |
| Create booking | `bookings.create` | Extra check in `CompanyController::storeBooking` |

## Data model used

Primary entity: **`companies`** (`App\Models\Company`) with **`company_status`**, aggregates for list (`total_spend_pence`, `last_booking_date` where implemented). Related collections on detail: **`contacts`**, **`company_locations`**, **`bookings`**, **`orders`**, **`knives`**, **`invoices`**, **`notes`** (polymorphic on company), **`audit_logs`** (polymorphic) for timeline.

## Customer profile sections (UI)

1. **Summary** — KPI cards from `/summary` (orders total, pipeline bookings, contacts/locations counts, open invoices).
2. **Contacts** — list + add (modal).
3. **Locations** — list + add (modal); required before creating a booking (location FK).
4. **Notes** — inline form + chronological list from detail payload.
5. **Activity** — `/activity` merged audit rows and note events.
6. **Bookings / orders / knives / invoices** — `DataTable` per collection from GET detail embeds.

## Known gaps

- **Review requests** — UI button only surfaces a toast; no outbound integration.
- **Export** — DataTable footer “Export (soon)” placeholder.
- **Edit/delete** for contacts, locations, individual bookings — not in MVP API surface on the profile.
- **Real-time** — no WebSocket refresh; refetch via TanStack Query invalidation after mutations.
- **E2E** — manual + `php artisan test` backend feature slice; Clerk-dependent Next.js build requires valid **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`** for production static verification.
