# Frontend architecture (WeSharp — Next.js admin)

Workspace: `**apps/frontend**` (Next.js **15**, App Router, React **19**, Tailwind).

---

## Public marketing site


| Concern | Implementation |
| --- | --- |
| Layout | `src/app/(public)/layout.tsx` + **`PublicShell`** — responsive header (**desktop links** + **`Sheet`** mobile menu), **`PUBLIC_SITE_NAV_LINKS`** in **`src/config/public-site-nav.ts`**. |
| Pages | **`/`**, **`/book`** (Zod + **`POST /api/public/booking-enquiries`**), **`/how-it-works`**, **`/pricing`**, **`/service-areas`**, **`/trade-accounts`**, **`/safety`**, **`/faq`**, **`/contact`**, **`/login`**, **`/register`**. Brochure pages reuse **`MarketingArticle`**. |

---

## Admin shell


| Concern    | Implementation                                                                                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout     | `src/app/(admin)/admin/layout.tsx` wraps children in `**AdminShell`**; `**export const dynamic = 'force-dynamic'**` so Clerk-using routes are not statically prerendered without keys. |
| Auth gate  | `**StaffRouteGate**` + Clerk session.                                                                                                                                                  |
| Feedback   | `**sonner**` `**<Toaster />**` mounted in `**AdminShell**` (global toasts).                                                                                                            |
| Navigation | `src/config/navigation.ts` — **Sprint 15.1** IA: **Command Centre**, **CRM**, **Operations**, **Routes**, **Finance**, **Customers**, **Growth**, **System**; items keep Laravel `permission` keys (e.g. `companies.view`, `routes.view`, `reports.finance`). |
| Status UI | **`StatusBadge`** (`src/components/status/StatusBadge.tsx`) — shared tone for **`booking` / `order` / `invoice` / `knife` / `route` / `route_stop` / `payment`** rows vs ad-hoc **`Badge`** usage. |

---

## Tenant portal shell

| Concern | Implementation |
| --- | --- |
| Layout | `src/app/(account)/account/layout.tsx` renders **`AccountShell`** with **`ACCOUNT_NAV`** filtered by Laravel permission strings from **`GET /api/v1/me`**. |
| Auth gate | **`TenantRouteGate`** enforces Clerk customer roles + **`company_id`** before hydrating children. |
| HTTP helper | `src/lib/api/use-account-api.ts` — Bearer **`/api/account/**`** transport (mirrors `useAdminApi`). |
| Schemas | `src/lib/api/account-schema.ts` — Zod parsers for KPI dashboards + paginated list envelopes. |
| Screens | **`/account/dashboard`** (`GET /api/account/dashboard` KPIs ); **`/account/bookings{,/new,/id}`** ; **`/account/orders`**, **`/account/knives`**, **`/account/invoices`** ; **`/account/locations`** ( **`account.locations.manage`** ); **`/account/settings`** ( **`account.settings.update`** ). |

---

## Admin CRM UI


| Concern     | Implementation                                                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| List        | `src/app/(admin)/admin/crm/page.tsx` — URL-driven **search params** (`q`, `city`, `status`, sort, direction, page); **TanStack Query** + `**useAdminApi`** (Bearer Clerk token to `NEXT_PUBLIC_API_ORIGIN`). |
| Profile     | `src/app/(admin)/admin/crm/[companyId]/page.tsx` — queries company + summary + activity; **Zod + react-hook-form** for note/contact/location/booking; dialogs; **DataTable** for tabular embeds.             |
| API typing  | `src/lib/api/admin-crm-schema.ts` — Zod parsers for list/detail/summary/activity (`PaginatedCompaniesResponseSchema`, `CompanyDetailResponseSchema`, etc.).                                                  |
| HTTP helper | `src/lib/api/use-admin-api.ts` — normalised JSON envelope handling.                                                                                                                                          |
| Money       | `src/lib/format/money.ts` — pence → GBP display helpers.                                                                                                                                                     |
| Components  | `src/components/crm/CompanyStatusBadge.tsx`, `src/components/tables/DataTable.tsx`, shadcn **Dialog**, **Select**, **Card**, **Input**, **Textarea**.                                                        |


---

## Admin bookings UI

| Concern | Implementation |
| --- | --- |
| List | `src/app/(admin)/admin/bookings/page.tsx` — filters (`status`, `city`, `date`, `service_type`) + DataTable; **Create booking** modal (companies + locations + optional contact). |
| Detail | `src/app/(admin)/admin/bookings/[bookingId]/page.tsx` — confirms / cancels (**AlertDialog**) / assigns / converts; internal notes `PUT`; timeline from API. |
| Schemas | `src/lib/api/admin-bookings-schema.ts` — list + detail Zod. |

---

## Orders & knives (admin ops)

| Concern | Implementation |
| --- | --- |
| Orders list | `src/app/(admin)/admin/orders/page.tsx` — **`GET /api/admin/orders`** via TanStack Query; **New order** dialog **`POST /api/admin/orders`** with `company_id` + `booking_id` UUID validation; pagination links; toast on errors; empty-state copy. |
| Order detail | `src/app/(admin)/admin/orders/[orderId]/page.tsx` — detail (`OrderDetailResponseSchema`), **Complete order**, **Bulk add knives**, **Add one knife** dialogs; redirects to **`/admin/knives/{id}`** for per-blade workflows. |
| Knives index | `src/app/(admin)/admin/knives/page.tsx` — filters map to Laravel query **`tag_id`**, **`q`**, **`status`**, **`company_id`**, **`order_id`**; DataTable incl. **`company_name`** from API list row. |
| Knife detail | `src/app/(admin)/admin/knives/[knifeId]/page.tsx` — workflow buttons (`mark-inspected` … **`report-issue`**), audit **timeline**, **`damage_reports`**, **`KnifeDetailResponseSchema`**; **`src/lib/knife-status-workflow.ts`** mirrors backend transition graph for UI enablement. |
| Schemas | `src/lib/api/admin-orders-schema.ts`, `src/lib/api/admin-knives-schema.ts`. |

---



## Admin invoices & payments UI

| Concern | Implementation |
| --- | --- |
| Invoices list | `src/app/(admin)/admin/invoices/page.tsx` — **`GET /api/admin/invoices`**; **New invoice** posts **`order_id`** + optional **`issue_date`/`due_date`** (**`InvoiceListResponseSchema`**). Badges + overdue column. **`Breadcrumbs`** supports **`crumbs`** alias. |
| Invoice detail | `src/app/(admin)/admin/invoices/[invoiceId]/page.tsx` — **Send**, **Mark paid**, **Void**, **Manual payment** dialogs; **`InvoiceDetailResponseSchema`** for items + nested payments. |
| Payments index | `src/app/(admin)/admin/payments/page.tsx` — **`GET /api/admin/payments`** (**`PaymentsListResponseSchema`**). |
| Schemas | `src/lib/api/admin-invoices-schema.ts`, `src/lib/api/admin-payments-schema.ts`. |



## Analytics UI (staff BI)

| Concern | Implementation |
| --- | --- |
| Analytics dashboard | `src/app/(admin)/admin/analytics/page.tsx` — parallel **`useQueries`** for **`/api/admin/analytics/{overview,sales,routes,operations}`**; KPI cards reuse server wording; filtering via URL (**`date_from`/`date_to`/`city`**). **`Recharts`** inside **`ResponsiveContainer`**; loaders + retry card for faults; **403 gate** UI when missing **`analytics.view`**. Monetary display via **`formatGbpFromPence`**. |
| Schemas | `src/lib/api/admin-analytics-schema.ts` — Zod parsers for Laravel envelopes. |

## Route Manager UI (mobile technician)

| Concern | Implementation |
| --- | --- |
| Layout boundary | `src/app/(route-manager)/layout.tsx` — **`"use client"`**; **`StaffRouteGate`** + **`ShellPermissionBoundary`** (**`adminPermissionForPath`**) so permission checks are not serialized from a server layout during **`next build`**. |
| Admin segment layout | `src/app/(route-manager)/admin/layout.tsx` — **`Toaster`** (+ nested **`StaffRouteGate`**). |
| Shell | **`RouteManagerShell`** — compact header, optional `stickyFooter` above **`MobileBottomNav`**; nav uses **`navHrefIsActive`** so **`/admin/routes/{id}`** highlights **All routes** without clashing **`/admin/routes/today`**. |
| Screens | `src/app/(route-manager)/admin/routes/**` — Today (`GET /api/admin/routes/today`), list (`GET /api/admin/routes?paginate=1`), detail, stop detail with POST/PUT workflows. |
| Schemas | `src/lib/api/admin-routes-schema.ts` — Zod mirrors for route + stop payloads. |
| PWA | `src/app/manifest.ts`; `public/icons/README.txt`; **`/offline`** placeholder page. |

**Ops dashboard:** **`src/app/(admin)/admin/dashboard/page.tsx`** pulls **`GET /api/admin/analytics/overview`** + **`sales`** via TanStack Query (Zod parsers) — loaders, retry, empty revenue copy.

---

## References

- Product: `docs/product/mvp-scope.md`, `docs/product/public-website.md`, `docs/product/admin-crm.md`, `docs/product/booking-workflow.md`, `docs/product/route-manager.md`, `docs/product/knife-tracking.md`, `docs/product/orders-invoices-payments.md`, `docs/product/analytics-reporting.md`, `docs/product/customer-portal.md`
- Backend: `docs/architecture/backend-architecture.md` § Admin CRM API, § Admin bookings API, § Orders & knives (operations), § Admin invoices & payments (AR), § Analytics API (internal BI), Route Manager controllers