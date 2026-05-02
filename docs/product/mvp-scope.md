# MVP scope — current state (WeSharp)

This document reflects **what ships in the repo today** — not the long-term roadmap. For deeper workflows see the linked product docs.

---

## Setup & run commands

### Backend (`apps/backend`)

- **Install:** `composer install`
- **Env:** copy `.env.example` → `.env`, set `APP_KEY`, database, `CLERK_*`, Stripe secrets as needed
- **DB:** `php artisan migrate --seed` (runs **`WeSharpDemoSeeder`** — demo operators, companies, bookings, routes, orders, knives, invoices, payments)
- **Serve:** `php artisan serve` (API at `http://localhost:8000`, routes under `/api/...`)
- **Tests:** `php artisan test`

### Frontend (`apps/frontend`)

- **Install:** `npm install`
- **Env:** copy **`env.local.example`** → `.env.local` — set **`NEXT_PUBLIC_API_ORIGIN`** (no trailing slash) and **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`**. If the Clerk key is missing at **build** time, the app uses a structural **`pk_test_...`** fallback so **`next build`** succeeds (replace with your real publishable key for production traffic).
- **Dev:** `npm run dev`
- **Quality:** `npx tsc --noEmit`, `npm run lint`
- **Production build:** `npm run build` then `npm run start`

---

## MVP feature list (implemented)

| Area | What exists |
| --- | --- |
| **Marketing / public** | Home, brochure pages (how it works, pricing, areas, trade, safety, FAQ, contact), **Request pickup** (**`/book`**) posting to **`POST /api/public/booking-enquiries`**, Clerk sign-in/register pages |
| **Admin console** | Dashboard (KPIs + chart), CRM, bookings, routes (list/today/detail/stop), orders, knives, invoices, payments, finance dashboard, analytics, reporting (`/admin/reports/*`), company subscriptions, subscription plans, notifications settings, audit log |
| **Route manager** | Mobile-first **`/admin/routes/*`** (+ **`/offline`**) with bottom nav and permission boundary |
| **Customer portal** | **`/account/*`** — dashboard, bookings (list/new/detail), orders, knives, invoices, locations, settings — all via **`/api/account/*`** + Clerk tenant gate |
| **Backend API** | Consistent **`App\Support\ApiResponses`** JSON (**`success`**, **`data`**, **`meta`**, or **`error`** with **`code`/`message`**, validation **`errors`**) |
| **Auth** | Clerk JWT → Laravel middleware (`clerk.auth`, `staff`, `tenant`) + permission belt |

---

## Routes (Next.js App Router)

### Public (mostly static)

- `/`, `/services`, `/how-it-works`, `/pricing`, `/service-areas`, `/trade-accounts`, `/subscriptions`, `/safety`, `/faq`, `/contact`, `/book`
- `/login`, `/register`, `/forbidden`, `/unauthorised`

### Admin (dynamic; `AdminShell` + permission boundary)

- `/admin/dashboard`, `/admin/crm`, `/admin/crm/[companyId]`
- `/admin/bookings`, `/admin/bookings/[bookingId]`
- `/admin/orders`, `/admin/orders/[orderId]`
- `/admin/knives`, `/admin/knives/[knifeId]`
- `/admin/invoices`, `/admin/invoices/[invoiceId]`, print view
- `/admin/payments`, `/admin/finance`, `/admin/analytics`, `/admin/audit`, `/admin/notifications`
- `/admin/reports/*` (sales, billing, operations, routes, knives, recurring revenue)
- `/admin/subscription-plans`, `/admin/subscriptions`
- `/admin/users`, `/admin/users/[userId]`

### Route manager (client layout; mobile shell)

- `/admin/routes`, `/admin/routes/today`, `/admin/routes/[routeId]`, `/admin/routes/[routeId]/stops/[stopId]`, `/offline`

### Customer portal

- `/account/dashboard`, `/account/bookings`, `/account/bookings/new`, `/account/bookings/[bookingId]`
- `/account/orders`, `/account/orders/[orderId]`, `/account/knives`, `/account/invoices`
- `/account/locations`, `/account/settings`

---

## API coverage (summary)

| Prefix | Purpose |
| --- | --- |
| **`GET /api/health`** | Liveness |
| **`POST /api/public/booking-enquiries`** | Throttled public lead + booking request (no auth) |
| **`POST /api/webhooks/stripe`** | Stripe webhooks (signature verified; idempotent event log) |
| **`POST /api/webhooks/clerk`** | Clerk webhooks — Svix signature, idempotent `webhook_inbox`, user sync (`docs/security/auth-sso.md`) |
| **`GET /api/admin/webhooks/inbox`** | Staff metadata-only webhook delivery log (`audit_logs.view`) — **admin UI:** `/admin/webhooks/inbox` |
| **`GET /api/v1/me`**, **`POST /api/v1/account/bootstrap-organisation`** | Profile / tenant bootstrap ( **`GET /api/v1/admin/smoke`**, **`GET /api/v1/account/smoke`** — registered only when `APP_ENV` ≠ `production`) |
| **`/api/account/*`** | Tenant portal (dashboard, bookings, orders, knives, invoices, locations, settings) |
| **`/api/admin/*`** | Internal ops: companies, bookings, routes, route-stops, orders, knives, invoices, payments, analytics |

Full route table: **`apps/backend/routes/api.php`**.

---

## Known gaps (honest backlog)

| Gap | Notes |
| --- | --- |
| Pricing engine | Rules are stored; evaluator / customer-facing catalogue API not wired |
| Outbound invoice email | “Send invoice” remains a placeholder flow in UI/API |
| Customer invoice pay links / PDF | Portal lists invoices; download + Stripe Checkout links backlog |
| Public contact form | **`/contact`** is mailto + CTA — no separate API |
| Offline PWA | **`/offline`** + manifest exist; full service-worker caching not implemented |
| Automated E2E | Manual QA checklist; add Playwright when stable |

See also **`docs/testing/qa-checklist.md`** and per-domain product docs.

---

## References

- **`docs/roadmap/sprint-12.1-audit.md`** — full-system audit (Sprint 12.1)
- **`docs/testing/qa-checklist.md`** — regression checklist
- **`docs/product/public-website.md`**, **`docs/product/customer-portal.md`**, **`docs/product/admin-user-stories.md`**
- **`docs/architecture/frontend-architecture.md`**, **`docs/architecture/backend-architecture.md`**, **`docs/architecture/system-architecture.md`**
