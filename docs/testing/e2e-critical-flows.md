# Critical E2E flows — MVP

These thirteen steps mirror the intended **full product path** across staff, route manager, workshop/finance roles, tenant portal, and public marketing. PHPUnit covers the **same business sequence at the HTTP/API layer** (`MvpOperationalPipelineApiTest`). Playwright automates **public shell + optional API health** today; Clerk-backed journeys stay opt‑in until we add session fixtures.

## Scripted chain (desired Playwright behaviour)

Enable with **`PLAYWRIGHT_RUN_CLERK_FLOWS=true`** plus stored auth state (**`storageState`** from a setup project). Implementation lives in **`apps/frontend/e2e/critical-flows.spec.ts`** (placeholder).

1. **Admin logs in** (`/admin`) — Clerk staff SSO.
2. **Admin creates company** — CRM “New account” or company API-backed flow.
3. **Admin creates booking** — **`/admin/bookings`** wizard.
4. **Admin assigns booking to route** — booking detail **`assign-route`**.
5. **Route manager opens today route** — **`/admin/routes/today`**.
6. **Route manager marks stop** — **`mark-arrived`**, **`mark-collected`** at **`…/routes/{id}/stops/{stopId}`**.
7. **Admin creates order from booking** — **`convert-to-order`**.
8. **Admin bulk‑adds knives** — order detail manifest.
9. **Admin progresses knives** — sharpened → returned (knife detail transitions).
10. **Admin creates invoice** — **`/admin/invoices`** from order.
11. **Admin marks invoice paid** — mark paid control (or **`POST …/payments/manual`** for ledger parity).
12. **Customer reads order / invoice** — **`/account/orders`**, **`/account/invoices`**.
13. **Public enquiry** — **`/book`** form posts **`POST /api/public/booking-enquiries`**.

## Current Playwright automation

File: **`apps/frontend/e2e/critical-flows.spec.ts`**

| Behaviour | Requirement |
| --- | --- |
| Marketing **`/` smoke** | Default — Playwright **`webServer`** runs **`npm run dev`** on port **3000** (reuse existing). |
| **Laravel `/api/health`** | Set **`PLAYWRIGHT_API_ORIGIN`** (scheme + host, **no** trailing slash). Omit to **skip**. |
| **Clerk thirteen-step bundle** | Set **`PLAYWRIGHT_RUN_CLERK_FLOWS=true`** once login helpers exist — otherwise skipped. |

## Manual runner quickstart

```bash
cd apps/frontend && npx playwright install chromium   # first machine only

# UI only (starts Next locally if needed):
cd apps/frontend && npm run test:e2e

# UI + API health (terminal A: `php artisan serve` ; terminal B):
PLAYWRIGHT_API_ORIGIN=http://127.0.0.1:8000 npm run test:e2e
```

## Gaps vs ideal E2E

- **Cookie / Clerk choreography** across staff vs tenant personas.
- **Stripe** payment buttons and PSP redirects.
- **File uploads** (knife photos).
