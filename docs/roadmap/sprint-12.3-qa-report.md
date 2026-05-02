# Sprint 12.3 — End-to-end QA report

**Date:** 2026-05-02  
**Scope:** Executable regression + permission/path audit + journey mapping to automated tests. Full browser, mobile hardware, live email, and Clerk-session Playwright flows are **partially deferred** (called out explicitly).

---

## 1. Tested journeys (coverage)

| # | Journey | How exercised | Result |
| --- | --- | --- | --- |
| 1 | **New customer** | `BootstrapTenantOrganisationApiTest`, `AccountCustomerBookingCreateTest`, `PublicBookingEnquiryApiTest`, marketing routes in `next build` | Pass (API); public pages build |
| 2 | **Existing customer** | `AccountSubscriptionApiTest`, `CustomerPortalFulfilmentApiTest`, tenant isolation `TenantCompanyIsolationTest` | Pass |
| 3 | **Admin** | `AdminBookingsApiTest`, `AdminCompaniesApiTest`, `AdminUserDirectoryApiTest`, `AdminAuditLogsApiTest`, CRM/filter tests | Pass |
| 4 | **POS (workshop desk)** | `AdminOrderDirectCreateApiTest`, `AdminKnifeServiceWorkflowApiTest`, `BulkOrderWorkshopApiTest`, invoice/payment tests | Pass |
| 5 | **Route / agent** | `AdminRoutePlanningApiTest`, `AdminRouteStopWorkflowApiTest`, `RouteCompletionApiTest`, `EvidencePhotoApiTest` | Pass |
| 6 | **Finance / reporting** | `AdminFinanceDashboardApiTest`, `AdminReportingApiTest`, `RecurringRevenueReportingApiTest`, `ReportExportApiTest` | Pass |
| 7 | **Permissions** | `StaffPermissionSeparationTest`, `AuthMiddlewareApiTest`, `AdminRouteAccessApiTest` | Pass |
| 8 | **Mobile** | Not run on real devices; **responsive** layouts rely on Tailwind + route-manager mobile shell — **manual** recommended | Deferred |
| 9 | **Email notifications** | `BookingEmailNotificationsTest`, `OrderEmailNotificationsTest`, `InvoiceEmailNotificationsTest`, `SubscriptionEmailNotificationsTest`, `NotificationSprint108Test` | Pass |
| 10 | **Webhooks** | `ClerkWebhookApiTest`, `StripeWebhookIdempotencyTest`, `Security/StripeWebhookSecurityTest` | Pass |

**Full pipeline:** `MvpOperationalPipelineApiTest` — documents cross-role API happy path.

---

## 2. Bugs found (severity)

| ID | Area | Description | Severity |
| --- | --- | --- | --- |
| B-1 | Admin shell | `/admin/reports/recurring-revenue` was not listed in `adminPermissionForPath` — fell through to `dashboard.view` while nav/API expect **`reports.finance`**. Hypothetical **403 → Forbidden** redirect for a user with `reports.finance` but without `dashboard.view` (future role) or inconsistent belt vs API. | **P2** (edge / consistency) |

No **P0** or **P1** issues discovered in this pass beyond B-1.

---

## 3. Fixes made

| Change | Rationale |
| --- | --- |
| `apps/frontend/src/lib/route-permissions.ts` — map **`/admin/reports/recurring-revenue`** → **`reports.finance`** | Align `ShellPermissionBoundary` with nav + Laravel report routes. |

---

## 4. QA automation summary

| Check | Result |
| --- | --- |
| `php artisan test` | **241 passed** |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run test` (Vitest) | **10 passed** |
| `npm run build` | Pass |

---

## 5. Remaining issues (accepted / deferred)

- **Clerk Playwright journeys** — still opt-in (`PLAYWRIGHT_RUN_CLERK_FLOWS`); see `docs/testing/e2e-critical-flows.md`.
- **Mobile device** camera, offline, and touch targets — manual QA.
- **Live SMTP / Postmark** — notification tests use fakes/array mailer in CI.
- **Staging** — confirm Clerk middleware redirects on `/admin` and `/account` with production-like keys (`sprint-12.1-audit.md`).
- **P2 product gaps** from sprint 12.1 audit (invoice email placeholder, public contact API, etc.) — not blocking for “no known P1” if treated as backlog.

---

## 6. Production readiness view

- **Automated regression:** **Green** — suitable to gate merges/CI.
- **Auth model:** Laravel RBAC + Clerk; middleware uses `await auth.protect()` on protected prefixes (12.1).
- **Release:** Recommend **manual smoke** on staging (sign-in, one booking, one report export, one webhook) before production cutover; **no P0/P1** left from this QA document after B-1 fix.

---

## 7. Files touched (Sprint 12.3)

- `apps/frontend/src/lib/route-permissions.ts`
- `docs/roadmap/sprint-12.3-qa-report.md` (this file)
- `docs/roadmap/sprint-12.md` — § Sprint 12.3 — Done
- `docs/roadmap/README.md` — status
