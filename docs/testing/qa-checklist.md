# QA checklist — Orders, knives, invoices & payments (MVP)

## Automated coverage pointers

- **PHPUnit** (`apps/backend`, `php artisan test`): health envelope, Clerk test-header auth fences, CRM company mutations, bookings flow, **`MvpOperationalPipelineApiTest`** chain (booking → route stop → knives → invoice → tenant list scoping), direct order create, manual payment settling, analytics overview stub, tenant isolation (**`TenantCompanyIsolationTest`**), public enquiry validation variants. Details: **`docs/testing/testing-strategy.md`**, **`docs/operations/mvp-test-checklist.md`**.
- **Vitest** (`apps/frontend`, `npm run test`): **`StatusBadge`**, **`Button`**, **`PUBLIC_BOOKING_ENQUIRY_SCHEMA`**, admin booking schema UUID gate, **`PaginatedCompaniesResponseSchema`**, route-stop workflow (**`route-stop-workflow`**).
- **Playwright** (`apps/frontend`, `npm run test:e2e`): marketing **`/`** smoke; optional **`GET /api/health`** when **`PLAYWRIGHT_API_ORIGIN`** is set; Clerk thirteen-step scaffold: **`docs/testing/e2e-critical-flows.md`**.

Prereqs: **`apps/backend`** running with **`php artisan migrate --seed`** ( **`WeSharpDemoSeeder`** — includes **`finance@demo.wesharp.test`** / **`driver@demo.wesharp.test`** for role-matrix checks ). Clerk **staff** user with **`orders.view` + `knives.view` + `orders.update` + `knives.update`** plus AR permissions **`invoices.view`**, **`invoices.create`**, **`payments.view`**, **`payments.manage`** (add **`payments.override`** only when testing excess manual amounts).

Environment: **`NEXT_PUBLIC_API_ORIGIN`** points at Laravel (**`/api`** prefix). Browser session signed in (**Clerk**).

---

## Build & marketing smoke (frontend)

- [ ] **`cd apps/frontend && npx tsc --noEmit`** — clean.
- [ ] **`npm run build`** — completes without **`Missing publishableKey`** (Clerk fallback in **`src/lib/clerk-publishable-key.ts`** covers CI; production must still set a real **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`**).
- [ ] Public pages render: **`/`**, **`/how-it-works`**, **`/pricing`**, **`/service-areas`**, **`/trade-accounts`**, **`/safety`**, **`/faq`**, **`/contact`**, **`/book`** — mobile header **menu** opens **`Sheet`** nav.
- [ ] Route manager: **`/admin/routes/today`** + **`/admin/routes`** — bottom nav **Today** vs **All routes** active states at **`/admin/routes/{uuid}`**.

---

## Regression smoke

- [ ] **`GET /api/health`** (or **`/api/health`**) responds **200**.
- [ ] **`GET /api/admin/orders?page=1&per_page=5`** Bearer token → **`200`** + **`success: true`** + **`items`** array.

---

## Order workflow (API + `/admin`)

1. [ ] **List** **`/admin/orders`** — rows render; pagination **Prev/Next** changes URL (**`page`**) and reloads query.
2. [ ] **Error simulation** — break **`NEXT_PUBLIC_API_ORIGIN`** or revoke token briefly → **error panel + Retry** appears (not only **`sonner`**).
3. [ ] **Create** — Open **New order**, paste valid **`company_id`** / **`booking_id`** from seeded data (same **`company`** as booking!) → **`POST /api/admin/orders`** succeeds → lands on **`/admin/orders/{uuid}`**.
4. [ ] **Add knife(s)** — **Add one knife**: confirm **`toast.success`** + new row in **Knives on this order** card with **`WS-`** style **`tag_id`**.
5. [ ] **Bulk add** — set count **3** → **Generate** adds three distinct **`tag_id`** values.
6. [ ] **Complete** — Click **Complete order** (**`POST …/complete`**) unless already **`completed`** — verify **`status`** updates and button disabled afterward.

Cross-check Laravel **optional**: **`audit_logs`** has **`order.*`** entries tied to **`App\Models\Order`**.

---

## Knife workflow (API + `/admin/knives`)

1. [ ] **Index filters** — **`/admin/knives`** set **Tag contains** substring of seeded **`tag_id`**, hit **Apply** → table narrows correctly.
2. [ ] **`status` filter** — pick **`sharpened`** (when data exists); **company_id** UUID filter trims set.
3. [ ] **Open detail** → workflow buttons (**Inspected**, etc.) mirror allowed transitions (invalid ones should **never** succeed — expect **422** if forced via scripted curl).
4. [ ] **Report issue** dialog — supply notes (**≥ 2 chars**) → **`issue_reported`** path or resume buttons appear per graph.
5. [ ] **Timeline** — chronological **`audit_logs`** entries show **`knife.*`** actions **with actor** names when seeded user performed actions.

Spot-check **`audit_logs`** rows: **`auditable_type`** = **`App\Models\Knife`**.

---

## Invoices & payments (API + `/admin`)

1. [ ] Smoke: **`GET /api/admin/invoices?page=1&per_page=5`** Bearer → **200** + **`items`** (requires **`staff`** + **`invoices.view`** token).
2. [ ] **`/admin/invoices`** — list loads; **Overdue** column follows API **`overdue`** (**`InvoiceRollup::isPastDue`**).
3. [ ] Pick an **`order_id`** lacking a non-void invoice — **New invoice** (**`POST /api/admin/invoices`**) opens detail (**`/admin/invoices/{uuid}`**); expect **`audit_logs`** **`invoice.created_from_order`**.
4. [ ] Detail — **Send** (**`POST …/send`** placeholder) — **`invoice.send_placeholder`** audit when transitioning draft → sent.
5. [ ] **Manual bank payment** — **`POST /api/admin/payments/manual`** with **`invoice_id`**, **`amount_pence`**, **`payment_method`** — verify **`payment.recorded.manual`** audit and invoice **Paid** when cumulative ≥ total.
6. [ ] **Mark paid** — **`invoice.marked_paid`** audit row.
7. [ ] **`/admin/payments`** — matches **`GET /api/admin/payments`** rows.

Minimal **`curl`** (replace **`$TOKEN`** and **`$API`** — base URL ending before **`/api`** or include **`/api`** consistently):

```bash
curl -sS -H "Authorization: Bearer $TOKEN" "$API/api/admin/invoices?per_page=3"
curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"order_id":"<ORDER_UUID>"}' "$API/api/admin/invoices"
```

---

## Permissions spot-check

Using a **Route Manager** seeded user ( **`orders.view` + knives.view`** but **`no orders.create`** if configured): confirm **403** via API on **`POST /api/admin/orders`** when exercised through HTTP client (**not assumption**).

Users with **`invoices.view`** but **without** **`payments.manage`** should receive **403** on **`POST /api/admin/payments/manual`**.

---

## Known manual gaps

Automated PHPUnit / Playwright suites may not cover every **`POST`** — keep this doc updated when workflows land in CI. **Outbound invoice email / PSP webhooks** remain backlog (see **`docs/product/orders-invoices-payments.md`**).


## Analytics (`/admin/analytics`)

Prereqs: staff account with **`analytics.view`** (finance / route_manager / admin in seed).

1. [ ] Smoke: **`curl -sS -H "Authorization: Bearer $TOKEN" "$API/api/admin/analytics/overview?date_from=2026-01-01&date_to=2026-12-31"`** → **200** + **`kpis`** object.
2. [ ] Charts load without console errors (**Recharts ResponsiveContainer**) at desktop + narrow viewport resizing.
3. [ ] **`city=Manchester`** (or seeded city) changes KPI / chart payloads vs unset filter (compare **`distinct_cities`** list + numbers).
4. [ ] Removing **`analytics.view`** from test user ⇒ **403** on all **`/analytics/*`** endpoints and forbidden UI banner on **`/admin/analytics`**.
5. [ ] Paid vs unpaid card matches **`paid_vs_open_invoices`** numbers from **`/sales`** (no totals computed purely in JSX beyond currency formatting strings).

Known gap: **`route_value_by_city`** can be empty if orders lack **`route_id`** linkage in seed/demo data — document expected empty chart.


## Customer portal (`/account/*`)

Prereqs: Clerk **tenant** user with **`dashboard.view`** + portal permissions (`**/api/v1/me`** lists **`account.locations.manage`**, **`account.settings.update`**). **`NEXT_PUBLIC_API_ORIGIN`** set.

1. [ ] Smoke: **`curl -sS -H "Authorization: Bearer $TOKEN" "$API/api/account/dashboard"`** → **200** with **`dashboard.kpis`**. Compare against **`curl … /api/account/orders?page=1&per_page=3`** (**403 should appear** if reused internal token — swap tenant token intentionally).
2. [ ] SPA: visit **`/account/dashboard`** — KPI tiles populate without console errors ; **Monthly spend / Outstanding balance** derive from Laravel integers only.
3. [ ] Bookings wizard **`/account/bookings/new`** submits after selecting location + ticking acknowledgements → redirects to **`/account/bookings/{uuid}`** detail.
4. [ ] **`/account/locations`** — create a test site, edit label, confirm list refresh + duplicate query cache for booking wizard.
5. [ ] **`/account/settings`** — update display name + AP email → **`PUT /api/account/settings`** reflected on reload ; Clerk email field stays read-only.
6. [ ] Negative: internal staff JWT calling **`GET /api/account/dashboard`** should **403** (`EnsureTenantCustomer`).

Known gap: invoice PDF download + Stripe pay links still backend/backlog (see **`docs/product/customer-portal.md`**).

---

## Public booking form (`/` + `/book`)

Prereqs: **`NEXT_PUBLIC_API_ORIGIN`**; Laravel reachable from the browser (**CORS** when marketing and API origins differ).

1. [ ] Marketing home shows **Request a pickup** linking to **`/book`**.
2. [ ] **`/book`** — Zod validation surfaces field errors; terms checkbox blocks submit until checked.
3. [ ] Happy path: submit a valid enquiry → success message with **next steps**; in admin CRM, confirm **lead** (or matched company), **location**, **contact**, and **`Requested`** booking (details in **`docs/product/public-website.md`**).
4. [ ] **`422`** — send an invalid payload (for example unchecked terms via **`curl`**) → `success: false` and `error.errors` keyed by field.
5. [ ] **`429`** — more than **10 POSTs/min per IP** returns throttle response (see **`tests/Feature/PublicBookingEnquiryApiTest`**).
6. [ ] **`NEXT_PUBLIC_API_ORIGIN`** unset locally → destructive alert and disabled submit.

Known gap: no Playwright/E2E for **`/book`** yet — complement API tests with manual UI checks.

---

## Security pass (routes, UI belts, PSP)

Automated regression: **`php artisan test`** (includes **`tests/Feature/Security/*`**, **`PublicBookingEnquiryApiTest`**).

Manual:

1. [ ] **Finance vs route ops** — as **`finance@demo.wesharp.test`** (local bypass header **`X-WeSharp-Test-User-Id`**), **`POST /api/admin/routes`** → **403**; **`GET /api/admin/payments`** → **200**.
2. [ ] **Route vs finance AR** — as **`driver@demo.wesharp.test`**, **`POST /api/admin/payments/manual`** → **403**; **`POST /api/admin/routes`** with minimal JSON → **201** (same user id used in PHPUnit **`StaffPermissionSeparationTest`**).
3. [ ] **Tenant isolation** — two portal users on different seeded companies (**or** scripted factories) ⇒ **`GET /api/account/orders/{peer}`** ⇒ **403** (`TenantCompanyIsolationTest` models the curl expectation).
4. [ ] **`POST /api/webhooks/stripe`** without **`STRIPE_WEBHOOK_SECRET`** ⇒ **503** safe JSON; valid signature ⇒ **200** **`received: true`** (see **`stripe-security.md`**).
5. [ ] SPA **deep link fence** — open **`/admin/payments`** as route_manager profile ⇒ redirect **`/forbidden`** ( **`ShellPermissionBoundary`** ). Public marketing header has **no** signed-in **`/account`** shortcuts without auth.
6. [ ] **`APP_DEBUG=false`** on staging — trigger synthetic **500** (optional) ⇒ JSON omits **`trace`** keys ( **`server_error`** envelope ).
7. [ ] Invoice detail — **Void** / **Mark paid** require confirmation dialogs before mutation.

---

## Sprint 4.10 — Admin operations QA (recorded)

**Automated (agent run, local repo):**

- [x] **`php artisan test`** (apps/backend) — **86** passed.
- [x] **`npm run lint`** — clean.
- [x] **`npm run typecheck`** — clean.
- [x] **`npm run build`** — clean.
- [x] **`npm run test`** (Vitest) — **10** passed.

**Manual / browser still required** for acceptance items 1–37 in the Sprint 4.10 brief (Clerk sessions per role, responsive widths **375 / 390 / 430 / 768 / desktop**, horizontal scroll audit, full booking→order→invoice chain in UI). Use **`WeSharpDemoSeeder`** identities where documented; **`npm run test:e2e`** covers marketing + optional API health when env is set — it does **not** replace signed-in admin matrix QA.

**UI tweaks shipped with 4.10 pass:** admin list/detail copy avoids **partial UUID** fallbacks where a human label exists (bookings ref column, booking breadcrumb, knife→order link, payments invoice link, order invoice chip + draft toast).
