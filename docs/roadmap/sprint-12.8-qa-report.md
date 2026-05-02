# Sprint 12.8 — Final production readiness QA report

**Date:** 2026-05-02  
**Scope:** Executable regression (full PHPUnit + frontend typecheck/lint/Vitest/build), static checks for debug/destructive patterns, documentation cross-check against Sprint 12.8 checklist. **No new product features.**  
**Manual browser, real devices, live SMTP, and production Clerk/staging URLs** are **not** re-run in this pass; they remain **pre-cutover** steps in **`docs/operations/production-deployment-readiness.md`**.

---

## 1. Final QA checks completed

| Sprint § | Area | How verified | Result |
| --- | --- | --- | --- |
| 1 | Core customer journey | `AccountCustomerBookingCreateTest`, `BootstrapTenantOrganisationApiTest`, `CustomerPortalFulfilmentApiTest`, `TenantCompanyIsolationTest`, account dashboard/order/booking API tests, `PublicBookingEnquiryApiTest`; marketing routes included in **`next build`** | **Pass** (automation); Clerk UX/sign-up is **manual/staging** |
| 2 | Core admin journey | `AdminBookingsApiTest`, `AdminCompaniesApiTest`, `MvpOperationalPipelineApiTest`, invoice/order mutations, `AdminAuditLogsApiTest` | **Pass** |
| 3 | POS journey | `AdminOrderDirectCreateApiTest`, `BulkOrderWorkshopApiTest`, `AdminKnifeServiceWorkflowApiTest`, workshop/bulk tests | **Pass** (API); POS **UI/tablet** manual recommended |
| 4 | Route/agent | `AdminRoutePlanningApiTest`, `AdminRouteStopWorkflowApiTest`, `RouteCompletionApiTest`, `EvidencePhotoApiTest`, driver scoping in policies + `StaffPermissionSeparationTest` | **Pass** |
| 5 | Finance/subscription | `AdminFinanceDashboardApiTest`, `AdminReportingApiTest`, `RecurringRevenueReportingApiTest`, `ReportExportApiTest`, subscription/dashboard tests | **Pass** |
| 6 | Emails/webhooks | `BookingEmailNotificationsTest`, `OrderEmailNotificationsTest`, `InvoiceEmailNotificationsTest`, `SubscriptionEmailNotificationsTest`, `ClerkWebhookApiTest`, `StripeWebhookIdempotencyTest`, `Security/StripeWebhookSecurityTest` | **Pass** (faked mail in CI); **live** provider = staging smoke |
| 7 | Security/permissions | `StaffPermissionSeparationTest`, `AuthMiddlewareApiTest`, tenant isolation tests; prior 12.5 API error sanitization + webhook messages | **Pass** (automation); **`APP_DEBUG=false`** = **ops config** on prod |
| 8 | Production cleanup | `rg` for `dd(`, `dump(`, `migrate:fresh` in app **sources** (none); demo seed skipped in prod (12.6); env documented in `.env.example`, `deployment.md` | **Pass** |
| 9 | Deployment readiness | `production-deployment-readiness.md`, `deployment.md`, `gitlab-environments-and-deployment.md`; **`GET /api/health`** shape covered by `HealthController` + tests | **Pass** (docs + health contract) |

### Automation summary (this run)

| Check | Result |
| --- | --- |
| `cd apps/backend && php artisan test` | **243 passed** |
| `cd apps/frontend && npm run typecheck` | **Pass** |
| `npm run lint` | **Pass** |
| `npm run test` (Vitest) | **10 passed** |
| `npm run build` | **Pass** |

---

## 2. Launch blockers

| ID | Severity | Description | Status |
| --- | --- | --- | --- |
| — | — | **None identified** in this pass. | — |

---

## 3. Launch blockers fixed

| Change | Rationale |
| --- | --- |
| *(none)* | No P0/P1 defects reproduced; tests already green. |

---

## 4. Files changed (Sprint 12.8)

- `docs/roadmap/sprint-12.8-qa-report.md` (this file)
- `docs/roadmap/sprint-12.md` — **§ Sprint 12.8 — Done**
- `docs/roadmap/README.md` — sprint 12 status

---

## 5. Post-launch backlog (non-blocking)

- **Product gaps** from **`docs/product/mvp-scope.md`** (e.g. hosted invoice PDF, public contact API) — track as P2+ unless promoted.
- **Clerk Playwright** full journeys — opt-in; see **`docs/testing/e2e-critical-flows.md`**.
- **Real device** camera/offline for route capture — manual QA.
- **Live mail** — validate one provider send on **staging** before prod.

---

## 6. Production risks (residual)

- **Operational:** Production still requires real **secrets**, **CORS**, **Clerk/Stripe** prod apps, and **staging smoke** per **`docs/operations/production-deployment-readiness.md`** — not a codebase defect.
- **Regression:** Future changes should keep **`php artisan test`** + frontend CI green before promote.

---

## 7. Final production readiness verdict

**READY**

*(Meaning: repository and full automated regression satisfy Sprint 12.8 acceptance for a **launch candidate**; complete **§4 post-deploy smoke** and **§6 launch checklist** on **staging/production** with real credentials immediately before customer cutover.)*
