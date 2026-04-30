# MVP test checklist — operations

Purpose: repeatable sign-off before a demo or prod deploy. Automated coverage is summarized in **`/docs/testing/testing-strategy.md`**.

---

## Backend — `cd apps/backend && php artisan test`

Automated PHPUnit (non-exhaustive list — see **`phpunit.xml`** for full suite):

- [x] **Health:** `GET /api/health` envelope + **`X-Request-ID`** (**`ApiFoundationTest`**).
- [x] **Auth middleware:** unauthenticated **`/api/admin/*`**, bogus test user ID, tenant vs staff separation (**`AuthMiddlewareApiTest`**).
- [x] **Company CRUD:** list/detail/mutations + soft destroy (**`AdminCompaniesApiTest`**, **`AdminCompaniesMutationApiTest`**).
- [x] **Booking:** create · confirm · cancel · assign-route date rule (**`AdminBookingsApiTest`**).
- [x] **Full ops pipeline:** company + location · booking confirm · route + assign · route-stop transitions · convert order · bulk knives · knife transitions · invoice · mark paid · tenant invoice list excludes peer (**`MvpOperationalPipelineApiTest`**).
- [x] **Order REST create:** direct **`POST /api/admin/orders`** (**`AdminOrderDirectCreateApiTest`**).
- [x] **Manual payment:** **`POST /api/admin/payments/manual`** settling remainder (**`AdminInvoiceManualPaymentApiTest`** + demo data).
- [x] **Analytics overview** payload (**`AdminAnalyticsOverviewApiTest`**).
- [x] **Tenant isolation:** customer cannot read alien order (**`TenantCompanyIsolationTest`**).
- [x] **Public enquiry validation & storage** (**`PublicBookingEnquiryApiTest`** incl. invalid email).

Additional security / webhook tests:** `StripeWebhookSecurityTest`**, **`StaffPermissionSeparationTest`**, **`WeSharpDemoSeederTest`** — run full suite routinely.

Still **manual-only**:** outbound email**, realistic **Stripe** browser sessions**, **performance / load.**

---

## Frontend — `cd apps/frontend && npm run test`

Vitest covers:

- [x] **UI primitives** — **`Button`** render probe.
- [x] **Status badges** — booking / knife blank + labels (**`StatusBadge.test.tsx`**).
- [x] **Booking validation** — admin create schema UUID rule (**`admin-create-booking-form-schema`**).
- [x] **CRM list contract** — `PaginatedCompaniesResponseSchema` parses sample (**`forms-and-route-workflow.test.ts`**).
- [x] **Route manager stop workflow matrix** (**`route-stop-workflow.ts`** assertions).
- [x] **Public booking enquiry** Zod refinement (**`PUBLIC_BOOKING_ENQUIRY_SCHEMA`**).

**Not Vitest-covered:** full **`/admin/*` pages**, React Query loaders, Clerk gates.

---

## E2E — `cd apps/frontend && npm run test:e2e`

- [x] Marketing home smoke (Playwright **`webServer`** auto-starts **`next dev`** when none bound).
- [ ] Laravel health against running API — set **`PLAYWRIGHT_API_ORIGIN`** or skip stays green.
- [ ] Full thirteen-step Clerk flow — enable **`PLAYWRIGHT_RUN_CLERK_FLOWS`** once helpers land.

Prefer **`npm run playwright:install`** once per machine for browsers.
