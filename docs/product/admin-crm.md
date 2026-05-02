# Admin CRM (MVP)

## Purpose

Operational CRM for internal staff: browse **companies (accounts)**, filter and sort the list, open a **customer profile**, and run day-to-day actions (notes, **contacts**, **service locations**, status, booking requests) against the Laravel API. Data is sourced from the domain model (`companies`, `contacts`, `company_locations`, `bookings`, `orders`, `knives`, `invoices`, `notes`, `audit_logs`).

## Screens built

| Route | Description |
| --- | --- |
| `/admin/crm` | List: search, city + status + subscription + unpaid/active booking filters, sort, pagination, DataTable, “New account” modal (POST create). Status and CRM signal badges. |
| `/admin/crm/[companyId]` | Profile: tabbed CRM (**Overview**, **Contacts**, **Locations**, users, bookings, orders, knives, invoices, **subscription** (CRM readiness panel), notes, activity). Overview uses summary KPIs + snapshot (default site, primary billing contact, etc.). **Contacts** and **Locations** support add, edit, archive/restore, primary billing / default site. Bookings table shows site and contact context when present. **Users** tab: list linked portal users; **Portal invitations** (send/resend) when the actor has **`companies.update`**. |

## API endpoints (backend)

Base path: **`/api/admin`** (Laravel `routes/api.php`; full URL prefix **`/api/admin/...`**).

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/companies` | `companies.view` |
| POST | `/companies` | `companies.create` |
| GET | `/companies/{company}` | `companies.view` |
| PUT | `/companies/{company}` | `companies.update` |
| DELETE | `/companies/{company}` | `companies.delete` |
| GET | `/companies/{company}/summary` | `companies.view` |
| GET | `/companies/{company}/activity` | `companies.view` |
| POST | `/companies/{company}/notes` | `companies.update` — **`body`** + **`visibility`**: **`internal`** (default, staff CRM only), **`customer`** (also returned on tenant booking + public tracking as **`customer_company_notes`**), **`route`** (staff with **`routes.view`**; hidden from pure finance viewers), **`finance`** (staff with invoices / **`reports.finance`** / payments / subscriptions read access; hidden from route-only viewers). **`company.note_added`** audit metadata includes **`visibility`**. |
| POST | `/companies/{company}/contacts` | `companies.update` |
| PUT | `/companies/{company}/contacts/{contact}` | `companies.update` |
| POST | `/companies/{company}/contacts/{contact}/archive` | `companies.update` |
| POST | `/companies/{company}/contacts/{contact}/restore` | `companies.update` |
| POST | `/companies/{company}/contacts/{contact}/set-primary` | `companies.update` |
| POST | `/companies/{company}/locations` | `companies.update` |
| PUT | `/companies/{company}/locations/{location}` | `companies.update` |
| POST | `/companies/{company}/locations/{location}/archive` | `companies.update` |
| POST | `/companies/{company}/locations/{location}/restore` | `companies.update` |
| POST | `/companies/{company}/locations/{location}/set-default` | `companies.update` |
| POST | `/companies/{company}/bookings` | `companies.view` + `bookings.create` |
| PUT | `/companies/{company}/status` | `companies.update` |
| POST | `/companies/{company}/portal-invites` | `companies.update` — customer portal email invite (Clerk when configured); **`data.invite`** |
| POST | `/companies/{company}/portal-invites/{invite}/resend` | `companies.update` |

Middleware: **`clerk.auth`**, **`staff`**. Responses use **`App\Support\ApiResponses`**.

### Contacts & locations behaviour

- **`archived_at`**: soft archive (no hard delete). Archived rows remain for **historical FKs** (bookings, orders). **Lookups** (`/lookups/locations`, `/lookups/contacts`) only list non-archived rows for pickers; direct lookup by `id` still resolves archived rows when needed.
- **Primary billing contact** maps to `contacts.billing_contact` (at most one active primary per company for new assignments).
- **Default service location** maps to `company_locations.is_default`. Archiving a default promotes another active location when possible.
- **Tenant portal** (`/api/account/locations`) only lists non-archived locations; updates to an archived location return **404**.

### Search / filter / sort (index)

See `App\Actions\Companies\BuildCompaniesIndexQuery` for `q`, `city`, `status`, subscription and invoice/booking filters, `sort`, `direction`, `page`, `per_page`.

### Subscription (Sprint 4.9 CRM readiness → Sprint 9)

- **List:** `subscription_status` on each row is the raw `company_subscriptions.status` when a row exists, otherwise JSON **`null`** (UI shows “—”). Filters **`subscription_status=none`** / **`active`** apply against the same source — **no MRR or revenue columns**.
- **Detail:** `GET /companies/{id}` includes **`data.subscription`** from **`App\Support\Crm\CompanySubscriptionCrmPayload`**: discriminated by **`state`** — **`none`** (no DB row, placeholder + Sprint 9 copy) or **`record`** (real `plan_name`, `status`, `current_period_end`, allowance text). **Recurring commercial value** is explicitly **not** stored yet (`recurring_amount_pence` is always **`null`** with an explanatory note).
- **Billing block** (billing contact, latest `is_subscription_billing` invoice, outstanding subscription-invoice balance) is returned only when **`billing_visibility`** is **`full`** (**super_admin**, **admin**, **finance**). **Route managers** get **`route_manager_limited`** — plan/status/dates only; no billing contact, invoice rows, or balances.
- **Actions:** `crm_actions[]` are UI stubs (**`available: false`**) until Sprint 9 (assign/change/cancel plan, subscription invoice list).

## Permissions required

| Capability | Permission | Notes |
| --- | --- | --- |
| List / view profile / summary / activity / lookups | `companies.view` | **Route managers** and **finance** can view company + embedded contacts/locations (read-only CRM). |
| Notes, contacts, locations, PUT company, archive/restore | `companies.update` | **Super admin / admin** only (per `Permissions` map). |
| Delete company | `companies.delete` | |
| Create booking from CRM | `bookings.create` | Extra check in `CompanyController::storeBooking`; **active** (non-archived) location required. |

Customer roles do not receive `companies.view` on **admin** routes; tenant APIs are separate under `/api/account/...`.

## Audit (company timeline)

Contact and location mutations record **`AuditLog`** rows on the **company** (same pattern as `company.contact_added`) so they appear in **`GET /companies/{id}/activity`**:

- `company.contact_updated`, `company.contact_archived`, `company.contact_restored`, `company.contact_primary_set`
- `company.location_updated`, `company.location_archived`, `company.location_restored`, `company.location_default_set`, `company.location_default_changed` (e.g. after archiving default site)

## Known gaps

- **Review requests** — UI placeholder toast only.
- **Export** — DataTable “Export (soon)” placeholder.
- **E2E** — manual + `php artisan test`; Next.js build needs valid Clerk env for production checks.

## QA checklist (Sprint 4.3)

1. Create / edit / archive / restore **contact**; set **primary billing**; confirm overview and activity update.
2. Create / edit / archive / restore **location**; set **default**; confirm overview and booking location picker exclude archived sites.
3. Attempt **booking** with archived `company_location_id` → **422**.
4. **Route manager**: can open company detail; **cannot** PUT contact/location (403).
5. **Mobile**: contacts/locations tabs — actions stack, minimum button height respected.
6. **Subscription tab**: company **without** `company_subscriptions` row → **`state: none`** placeholder; **with** row → plan, status, renewal, allowance text; **no** fabricated recurring GBP.
7. **Route manager**: subscription tab shows plan/status only — **no** billing contact, latest subscription invoice, or outstanding balance in JSON.
8. **Finance / admin**: full billing block when subscription + `is_subscription_billing` invoices exist; invoice links respect **`invoices.view`** on the SPA.
9. **CRM list**: Subscription column shows status label or “—”; filter **Active** / **No subscription** still works.
