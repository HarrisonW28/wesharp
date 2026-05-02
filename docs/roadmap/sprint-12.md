# WeSharp Sprint 12 Roadmap

## Sprint 12.1 — Full System Audit

Context:
WeSharp has been built through the major MVP feature set. Now audit before production hardening.

Goal:
Perform a full system audit.

Important:
- Do not build new features unless needed to complete existing workflows.
- Do not rewrite the app.
- Identify broken, duplicated, incomplete, confusing or risky areas.
- Focus on whether real customers/admin staff can use the system.

Audit:
1. Public website
2. Customer portal
3. Admin portal
4. POS workflow
5. Route/photo workflow
6. Pricing/revenue
7. Subscriptions/reporting
8. Emails/notifications
9. Webhooks
10. Security/permissions
11. Technical health
12. Mobile/responsive

Severity:
- P0 blocks production/login/security/core flow
- P1 major broken workflow
- P2 confusing UX
- P3 polish

Deliverables:
- audit summary
- broken workflows
- bugs grouped by severity
- production blockers
- duplicate/dead code list
- risky permissions
- UX polish list
- recommended fix order

Acceptance criteria:
- Full audit output produced.
- P0/P1 issues clearly identified.
- Production blockers listed.
- No major feature work added.

### Sprint 12.1 — Done (implementation summary)

- **Deliverable:** `docs/roadmap/sprint-12.1-audit.md` — full audit across public site, portals, effective POS (admin desk), routes/photos, pricing/revenue, subscriptions/reporting, notifications, webhooks, security, technical health, mobile/responsive notes; severity table; blockers; duplicate/risk lists; fix order.
- **P0 fix:** `apps/frontend/src/middleware.ts` — Clerk `await auth.protect()`; explicit **protected** route prefixes only so marketing + `/book` stay public.
- **Docs:** `docs/product/mvp-scope.md`, `docs/security/auth-sso.md`; `docs/roadmap/README.md` status bump.

---

## Sprint 12.2 — Critical Bug Fixing

Context:
Sprint 12.1 produced audit results. Now fix P0 and P1 issues.

Goal:
Fix critical/major bugs before polish or production cleanup.

Important:
- Only fix P0/P1 issues.
- Do not add large new features.
- Keep changes focused and testable.
- Preserve architecture.

Fix priority:
1. login/auth
2. roles/permissions
3. booking
4. admin booking/order/route
5. pricing/invoice
6. POS
7. photo/upload
8. emails/webhooks
9. dashboard/reporting data
10. mobile nav/sign-in blockers
11. 500 errors

Acceptance criteria:
- All P0 fixed.
- P1 fixed or clearly documented if deferred.
- Customer can sign up/log in.
- Admin can use admin areas.
- Customer cannot access admin.
- Booking/order/route/pricing/invoice core flow works.
- No obvious 500s in normal flows.

QA:
- backend tests if available
- frontend lint/typecheck/build
- customer flow
- admin flow
- POS flow
- route/photo flow
- invoice/pricing flow
- email/webhook flow

End with:
- bugs fixed
- files changed
- remaining known issues
- QA results
- next recommended phase

### Sprint 12.2 — Done (implementation summary)

- **Bugs fixed / closed:** **P0** from audit addressed in 12.1 (Clerk middleware). **P1-2** — webhook inbox had API but no ops UI; added **`/admin/webhooks/inbox`** (metadata table, `audit_logs.view`), sidebar + route-manager nav, `ShellPermissionBoundary` mapping in `route-permissions.ts`.
- **Files:** `apps/frontend/src/app/(admin)/admin/webhooks/inbox/page.tsx`, `apps/frontend/src/lib/api/admin-webhooks-inbox-schema.ts`, `apps/frontend/src/config/navigation.ts`, `apps/frontend/src/lib/route-permissions.ts`, `docs/product/mvp-scope.md`, `docs/roadmap/sprint-12.1-audit.md`, `docs/roadmap/sprint-12.md`, `docs/roadmap/README.md`.
- **Remaining known issues:** P2+ items from `sprint-12.1-audit.md` (invoice email, contact API, E2E, etc.); staging manual verify Clerk redirects.
- **QA:** `npm run typecheck`, `npm run lint`, `npm run build` (frontend); `php artisan test` (backend — unchanged).
- **Next:** Sprint **12.3** end-to-end QA.

---

## Sprint 12.3 — End-to-End QA

Goal:
Test WeSharp from start to finish as customer, existing customer, admin, POS user, route user and finance user.

Important:
- Do not add features.
- Log bugs clearly.
- Fix only small obvious bugs during QA.
- Larger fixes should be listed.

Test scenarios:
1. New customer journey
2. Existing customer journey
3. Admin journey
4. POS journey
5. Route/agent journey
6. Finance/reporting journey
7. Permission testing
8. Mobile testing
9. Email notification testing
10. Webhook testing if available

Acceptance criteria:
- Every core user journey tested.
- Bugs listed with severity.
- No P0 bugs remain.
- No known P1 bugs remain unless accepted.
- Empty states are clear.
- No dead buttons in core journeys.
- No confusing raw UUIDs.
- No duplicate headers/footers.
- Mobile is usable.

End with:
- tested journeys
- bugs found
- fixes made
- remaining issues
- production readiness view

---

## Sprint 12.4 — UX/UI Production Polish

Goal:
Polish the app so it feels consistent, trustworthy and ready for normal users.

Important:
- Do not add major functionality.
- Fix rough edges, layout problems, small copy issues and confusing UI.
- Prioritise mobile readability.
- Keep customer pages customer-friendly and admin pages operational.

Polish:
1. Public site layout/copy
2. Mobile nav/sign-in
3. Customer dashboard
4. Booking flow
5. Admin dashboard
6. Tables/cards
7. Buttons/actions
8. Empty/loading/error states
9. Status badges
10. Forms/lookups
11. Email copy consistency
12. Responsive spacing/font sizes

Acceptance criteria:
- UI feels consistent.
- Text is readable on mobile.
- Buttons have clear labels.
- No double headers/footers.
- No tiny/cramped layouts.
- Empty states are useful.
- Errors are friendly.
- Customer pages do not feel admin-heavy.

QA:
- desktop/mobile public site
- customer portal
- admin portal
- POS
- route user mobile
- forms/tables
- emails
- dark/light if applicable

End with:
- files changed
- polish summary
- QA checklist
- known limitations

---

## Sprint 12.5 — Security, Permissions and Data Protection Review

Goal:
Review and harden permissions, data access, uploads, auth and sensitive customer data handling.

Important:
- Backend permissions matter more than frontend hiding.
- Clerk handles authentication only.
- Laravel remains source of truth for roles/permissions.
- Customer data/photos/invoices must not leak between accounts.
- Do not expose stack traces or secrets.

Review/fix:
1. Customer cannot access admin API/UI.
2. Admin roles work correctly.
3. Finance permissions limited correctly.
4. Route users see only assigned/allowed work.
5. Customers see only their own bookings/orders/photos/invoices.
6. Upload/photo access controlled.
7. Signed/private file access if needed.
8. API errors do not leak internals.
9. Webhook signatures verified.
10. CORS correct.
11. Env secrets not committed.
12. Audit logs for sensitive changes.
13. Rate limiting/basic abuse controls where useful.

Acceptance criteria:
- Permission matrix documented.
- Role access tested.
- Customer data isolation tested.
- Upload/photo visibility tested.
- Webhook verification confirmed.
- No obvious secrets/debug output exposed.
- No frontend-only protection for admin APIs.

QA:
- test customer trying admin routes
- route manager trying finance routes
- finance trying operational restricted actions
- customer trying another customer record
- bad webhook signature
- upload/photo access
- unauthenticated API calls
- forbidden/error responses

End with:
- files changed
- permission matrix
- security issues fixed
- QA checklist
- remaining risks

---

## Sprint 12.6 — Production Cleanup

Goal:
Remove development/demo/debug behaviour and prepare for real production use.

Important:
- Do not run destructive commands on production data.
- Production must not depend on seed/demo data.
- Debug output must be removed.
- Demo routes/data must be disabled or dev-only.
- Keep config environment-based.

Clean up:
1. Remove debug output: dd(), dump(), console.log spam, debug banners, debug endpoints, hardcoded test users/IDs/URLs
2. Demo/seeder behaviour: demo seeders not run in production, fake data not required, fake() helper issues fixed/dev-only
3. Env config: production env vars, Clerk, DB, mail, storage, queue/cache/session
4. Error handling: no stack traces, consistent API errors, friendly auth/forbidden/upload errors
5. Data safety: safe migrations, no migrate:fresh in prod docs/scripts, backups documented, logs writable, storage linked if needed
6. Build/deploy cleanup: frontend build, composer install, Laravel caches, Plesk/nginx notes

Acceptance criteria:
- No debug output in production paths.
- Demo seeders not required.
- Production env clean.
- APP_DEBUG false.
- Core pages do not expose raw errors.
- App deploys from clean pull/install/build.
- Known limitations documented.

End with:
- files changed
- cleanup summary
- env checklist
- production risks
- QA checklist

---

## Sprint 12.7 — Production Deployment Readiness

Goal:
Prepare WeSharp for controlled production deployment.

Tasks:
1. Deployment guide covering git pull, composer install, npm install/build if needed, env vars, migrations, Laravel cache commands, permissions, storage link, queue/scheduler if used, Plesk/nginx notes and rollback steps
2. Backup process covering database backup before deploy, uploaded files/photos backup, env backup and rollback plan
3. Smoke tests after deploy: /api/health JSON, frontend loads, sign in, /api/v1/me with Clerk token, customer/admin portals, booking create, pricing, invoice generation, email send/log, webhook test, mobile nav
4. Monitoring/logs: Laravel logs, nginx/apache logs, failed jobs, webhook failures, public PHP errors hidden
5. Launch checklist: production Clerk app, production database, production env, backups, rollback, staging tested, P0/P1 resolved, seed/demo disabled, APP_DEBUG=false

Acceptance criteria:
- Deployment guide exists.
- Rollback guide exists.
- Smoke test checklist exists.
- Production env checklist exists.
- App can be deployed repeatably.
- Launch blockers clearly listed.

End with:
- files changed
- deployment checklist
- rollback checklist
- smoke test checklist
- launch blockers
- production readiness verdict

---

## Sprint 12.8 — Final Production Readiness QA

### Context
Sprints 12.1–12.7 covered:
- full system audit
- critical bug fixing
- end-to-end QA
- UX/UI production polish
- security, permissions and data protection review
- production cleanup
- production deployment readiness

### Goal
Final production readiness QA before launch candidate.

### Rules
- Do not add new product features.
- Fix only launch-blocking bugs.
- Anything non-blocking should be documented as post-launch backlog.
- Confirm the app is safe to use with real customers/admin staff.
- Confirm production deployment can be performed repeatably.
- Confirm there are no known P0/P1 launch blockers.

### Final QA areas

#### 1. Core customer journey
Check:
- public site loads
- customer can sign up
- customer can log in
- new users default to customer role
- customer can create booking
- customer can choose/request time window
- customer can view booking status
- customer can view order status
- customer can view knife/photo updates where allowed
- customer can view invoice/payment status
- customer can view subscription usage where applicable
- customer cannot access admin areas

#### 2. Core admin journey
Check:
- admin can log in
- admin can manage customers/companies
- admin can create/update booking
- admin can assign booking to route
- admin can convert booking to order
- admin can add knives/items
- admin can price order
- admin can generate/issue invoice
- admin can complete order
- admin can view audit/activity where applicable

#### 3. POS journey
Check:
- POS mode opens
- POS guides the sales interaction
- customer lookup/create works
- booking/order creation works
- knife count/pricing works
- photo skip/continue-later behaviour works if implemented
- summary/confirmation is clear
- mobile/tablet layout is usable

#### 4. Route/agent journey
Check:
- route user can log in
- route user sees assigned work only
- status updates work
- photos can be captured/uploaded
- photos are timestamped
- photos link to correct knife/order/customer
- customers only see allowed photos

#### 5. Finance/subscription journey
Check:
- invoices work
- payment statuses work where implemented
- pricing/revenue totals are accurate
- subscription usage is accurate
- recurring revenue reporting makes sense
- overage revenue is separated
- unpaid/overdue values are clear

#### 6. Emails and webhooks
Check:
- booking emails
- order emails
- invoice/payment emails
- subscription emails
- notification preferences/logs
- failed send logging
- duplicate-send prevention
- Clerk webhook signature verification
- webhook idempotency
- new Clerk users default to customer

#### 7. Security and permissions
Check:
- customer cannot access admin UI/API
- route manager permissions are limited
- finance permissions are limited
- admin/super_admin permissions work
- customers cannot access other customers' data
- photos/uploads are protected
- API errors do not expose stack traces/secrets
- APP_DEBUG is false for production

#### 8. Production cleanup
Check:
- no dd()/dump()
- no console spam in production paths
- no hardcoded test users
- no hardcoded local URLs
- demo seeders are not required
- production does not rely on fake data
- no migrate:fresh in production docs
- logs are writable
- storage is configured
- environment variables are documented

#### 9. Deployment readiness
Check:
- staging/prod separation documented
- production database separate
- production Clerk app separate
- backups documented
- rollback documented
- deployment checklist works
- smoke test checklist exists
- /api/health returns JSON
- frontend production build passes
- backend install/cache/migrate steps documented

### Acceptance criteria
- No P0 launch blockers remain.
- No P1 launch blockers remain unless explicitly accepted.
- Core customer journey works.
- Core admin journey works.
- POS/route/photo flows work.
- Pricing/invoice/subscription reporting is accurate enough for launch.
- Permissions and data isolation are safe.
- Production cleanup is complete.
- Deployment/rollback process is documented.
- Final launch risks are documented.

### Required output
At the end, provide:
- final QA checks completed
- launch blockers found
- launch blockers fixed
- files changed
- post-launch backlog
- production risks
- final production readiness verdict: READY / NOT READY