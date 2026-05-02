# Sprint 14.7 — Sprint 14 regression QA report

**Date:** 2026-05-01  
**Scope:** Regression against Sprint 14 themes (public conversion, subscriptions display, invites, notifications, feedback, permissions, isolation). Full device/browser QA and Clerk-hosted flows are partially deferred where noted.

---

## 1. Checklist → coverage

| # | Area | How exercised | Result |
| --- | --- | --- | --- |
| 1 | **Service area checker** | `ServiceAreaPublicApiTest`; frontend `public-service-area-schema.test.ts`; **`next build`** includes `/service-areas` | Pass |
| 2 | **Waitlist** | `ServiceAreaPublicApiTest` (waitlist + admin list); admin route in build | Pass |
| 3 | **Pricing calculator** | `PublicPricingEstimateApiTest`; frontend `public-pricing-estimate-schema.test.ts`; `/pricing` build | Pass |
| 4 | **Packages** | `PublicPricingEstimateApiTest` (plan-backed estimates); `PublicSubscriptionPlansCatalogTest` | Pass |
| 5 | **Backend-driven subscription cards** | `PublicSubscriptionPlansCatalogTest` / `site-content` embedding; `SiteContentApiTest` | Pass |
| 6 | **Custom/bespoke plan enquiry** | Covered indirectly via public booking/enquiry and site content; no dedicated PHPUnit name — **`PublicBookingEnquiryApiTest`** for enquiry path | Pass (API) |
| 7 | **Inactive plans hidden (public)** | `PublicSubscriptionPlansCatalogTest`, `SubscriptionDataModelTest` | Pass |
| 8 | **Customer invites** | `CustomerPortalInviteApiTest` | Pass |
| 9 | **Portal onboarding** | Not a single named PHPUnit; relies on account shell + **`TenantCompanyIsolationTest`** for tenant safety — **manual smoke** on staging still useful | Partial (deferred manual) |
| 10 | **Note visibility** | `CompanyNoteVisibilityApiTest`; `AdminInvoiceLifecycleApiTest` (portal strips internal notes); `AccountSubscriptionApiTest` (no internal notes) | Pass |
| 11 | **Notification centre** | `InAppNotificationApiTest` + notification-related tests in email suites; UI builds **`/admin/notifications`**, **`/account/notifications`** | Pass |
| 12 | **Feedback flow** | `OrderFeedbackApiTest` | Pass |
| 13 | **Permissions** | `StaffPermissionSeparationTest`; invite/feedback/route tests with role negatives | Pass |
| 14 | **Customer data isolation** | `TenantCompanyIsolationTest` | Pass |
| 15 | **Mobile UX** | Not run on physical devices; responsive layouts via Tailwind + shells — **manual** recommended | Deferred |

---

## 2. Bugs found

| ID | Severity | Description |
| --- | --- | --- |
| B-1 | **P0** | `Gate::policy(OperationalRoute::class, OperationalRoutePolicy::class)` in `AppServiceProvider` resolved `OperationalRoutePolicy` to `App\Providers\OperationalRoutePolicy` (wrong namespace), causing **500** on any code path authorizing operational routes (e.g. admin dashboard search). |

No additional P0/P1 issues found in this pass after B-1.

---

## 3. Bugs fixed

| Change | Rationale |
| --- | --- |
| `apps/backend/app/Providers/AppServiceProvider.php` — `use App\Policies\OperationalRoutePolicy;` | Binds the correct policy class for `OperationalRoute` authorization. |

---

## 4. Automation summary

| Check | Result |
| --- | --- |
| `php artisan test` (apps/backend) | **294 passed** |
| `npm run typecheck` (apps/frontend) | Pass |
| `npm run lint` | Pass |
| `npm run test` (Vitest) | **15 passed** |
| `npm run build` | Pass |

---

## 5. Deferred / accepted gaps

- **Real mobile hardware** (touch targets, keyboard, viewports) — manual.
- **Portal onboarding** end-to-end (Clerk + first-run) — recommend staging smoke; not fully encoded in one test name.
- **Playwright / Clerk** flows — opt-in per project E2E policy.

---

## 6. Sprint 14 final verdict

**PASS** — Automated regression green after B-1; no known P1 blockers remaining from this QA cycle.

---

## 7. Files touched (Sprint 14.7)

- `apps/backend/app/Providers/AppServiceProvider.php`
- `docs/roadmap/sprint-14.7-qa-report.md` (this file)
- `docs/roadmap/sprint-14.md` — § Sprint 14.7 status
