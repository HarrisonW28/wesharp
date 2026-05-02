# Sprint 15.6 — Sprint 15 regression QA report

**Date:** 2026-05-01  
**Scope:** Navigation, role/developer separation, subscription plan public display, portal isolation. Browser-only checks (sidebar polish, real mobile drawer gestures) partially deferred.

---

## 1. Checklist → coverage

| # | Check | How exercised | Result |
| --- | --- | --- | --- |
| 1 | **Admin sidebar desktop** | `next build` includes admin routes; nav config `ADMIN_NAV_SECTIONS` | Pass (build) |
| 2 | **Mobile drawer** | `AdminShell` + `SidebarNav` / `MobileDrawer` unchanged; no TS regressions | Pass (build) |
| 3 | **Role visibility** | `filterNavSections` + permissions on `NavItem`s; backend `Permissions` map | Pass (existing tests) |
| 4 | **Developer links** | `ClerkWebhookApiTest`, `AdminAuditLogsApiTest`; nav webhook uses `system.tools.view` | Pass |
| 5 | **Route manager links** | `ROUTE_MANAGER_NAV_SECTIONS` + bottom nav; `StaffPermissionSeparationTest` | Pass |
| 6 | **Finance links** | `AdminSubscriptionPlanApiTest` (finance), invoice/payment separation tests | Pass |
| 7 | **Subscription plan admin display** | `AdminSubscriptionPlanApiTest`, `PublicSubscriptionPlansCatalogTest` (public name/description) | Pass |
| 8 | **Customer portal unaffected** | `AccountSubscriptionApiTest`, `TenantCompanyIsolationTest` | Pass |
| 9 | **Backend permission enforcement** | Feature tests across admin APIs; webhook `system.tools.view` middleware | Pass |
| 10 | **No broken nav links** | Build route table; hrefs in `navigation.ts` | Pass |

---

## 2. Bugs found

| ID | Area | Description | Severity |
| --- | --- | --- | --- |
| B-1 | **Shell gate** | `adminPermissionForPath` defaulted several admin URLs to **`dashboard.view`** while nav/API expect **`subscriptions.view`**, **`companies.view`** (waitlist), or **`settings.manage`** (content settings). Risk: user with the real capability hits **Forbidden** in `ShellPermissionBoundary` before the page loads, or belt disagrees with API (same class of issue as Sprint 12.3 recurring-revenue). | **P2** |

No P0/P1 issues found in automated pass beyond B-1.

---

## 3. Bugs fixed

| Change | Rationale |
| --- | --- |
| `apps/frontend/src/lib/route-permissions.ts` — **`/admin/waitlist`** → **`companies.view`**; **`/admin/subscription-plans`** & **`/admin/subscriptions`** → **`subscriptions.view`**; **`/admin/content-settings`** → **`settings.manage`** | Align shell permission resolver with sidebar + Laravel. |
| `apps/frontend/src/lib/route-permissions.test.ts` | Regression guard for the above mappings. |

---

## 4. Automation summary

| Check | Result |
| --- | --- |
| `php artisan test` (apps/backend) | **299 passed** |
| `npm run typecheck` / `lint` / `test` / `build` (apps/frontend) | **Pass** (Vitest includes new route-permissions test) |

---

## 5. Deferred / manual

- **Pixel-perfect sidebar / drawer** on real breakpoints — smoke on staging.
- **Playwright** admin journeys — optional per project policy.

---

## 6. Sprint 15 final verdict

**PASS** — Automated regression green; B-1 fixed in frontend shell mapping.

---

## 7. Files touched (Sprint 15.6 QA)

- `apps/frontend/src/lib/route-permissions.ts`
- `apps/frontend/src/lib/route-permissions.test.ts`
- `docs/roadmap/sprint-15.6-qa-report.md` (this file)
- `docs/roadmap/sprint-15.md` — § Sprint 15.6 status
