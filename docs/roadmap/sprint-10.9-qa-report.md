# Sprint 10.9 — Notifications, Pricing and Subscription Revenue Regression QA

**Date:** 2026-05-01  
**Scope:** Sprints 10.3–10.8 integration; no new product features (per sprint rules).

---

## QA checks completed

### Automated

| Check | Result |
| --- | --- |
| Full Laravel test suite (`php artisan test`) | **233 tests, 962 assertions — all passed** |
| Notification feature tests (preferences, idempotency, deliveries API, permissions) | Included in suite |
| Order / invoice / subscription API feature tests | Included in suite |
| Staff permission separation (finance vs route manager, etc.) | Included in suite |

### Code review (static), Sprint 10 focus areas

| Area | Finding |
| --- | --- |
| **Email notification regression** | Customer email services use human references (`BookingResource::reference`, `OrderJson::reference`, invoice numbers, subscription refs) in bodies; UUIDs appear only in delivery **metadata** / ids for staff systems, not in Blade body copy reviewed under `resources/views/emails/notifications/`. |
| **Duplicate send prevention** | `notification_deliveries` unique `(channel, type, idempotency_key)`; invoice resend documented with salt. |
| **Failed sends** | `notification_deliveries.status=failed` + `failure_reason`; global admin index `GET /api/admin/notifications/deliveries`. |
| **Preferences** | `NotificationPreferenceGate` + skipped rows with `preference_skip` meta; admin override flags on `notification_admin_settings`. |
| **Customer portal payloads** | `PortalBookingPayload` strips `internal_notes` and internal estimate fields from list/detail; `OrderJson::portalDetail` avoids internal item noise and uses customer labels. |
| **Permissions** | `notifications.deliveries.view` for finance/admin; route managers blocked (see `StaffPermissionSeparationTest` + global deliveries). |

### Manual / staging (deferred to humans)

The following were **not** executed in this pass (no live mail, no browser driver in CI):

- Visual verification of emails in real inboxes (Resend/Postmark, HTML clients).
- End-to-end Clerk sign-in on customer + admin portals.
- Live Stripe webhooks and real payment-failure paths.
- Load/performance of recurring revenue dashboards with large datasets.

---

## Bugs found

**None** that reproduced under automated tests or quick static review of Sprint 10 paths.

---

## Bugs fixed

**None required** for this sprint (no failures observed).

---

## Files changed

| File | Change |
| --- | --- |
| `docs/roadmap/README.md` | Roadmap status updated through Sprint 10.9. |
| `docs/roadmap/sprint-10.9-qa-report.md` | This report (required Sprint 10.9 output). |

---

## Deferred issues (document-only)

1. **Manual email QA** — Confirm rendering in Gmail/Outlook mobile; verify links use `FRONTEND_URL` / customer portal base URL in each environment.
2. **`subscription.renewed` / provider payment failures** — Still pending real billing provider wiring (already noted in `apps/backend/docs/product/notifications.md` limitations).
3. **Customer URLs** — Portal routes use UUIDs in path segments (acceptable for deep links); visible **labels** should continue to use references everywhere user-facing copy is shown (ongoing UX guideline).
4. **Pricing vs invoice** — Strong coverage in tests; any new manual override or refund flows should add targeted tests when built.

---

## Sprint 10 final verdict

**PASS** — Automated regression is green; Sprint 10 surfaces reviewed for obvious integration holes without finding P0/P1 issues. Residual risk is limited to manual/staging verification items above.

---

## QA checklist (from sprint brief) — traceability

- **Email:** booking / order / invoice / subscription paths covered by tests + docs; duplicates, failures, preferences, resend (invoice) covered in code/tests.
- **Order & pricing:** exercised via existing feature tests; no new failures.
- **Invoice & payment:** draft/issue flows and notification idempotency covered in suite.
- **Subscription & revenue:** subscription/period/billing tests pass; dashboard routes policy-gated.
- **Customer portal:** tenant payloads strip internal fields per `PortalBookingPayload` / `OrderJson`.
- **Admin/finance:** pricing, invoices, notifications log permissions align with `Permissions` map and tests.
