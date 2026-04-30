# QA checklist — Orders, knives, invoices & payments (MVP)

Prereqs: **`apps/backend`** running with **`php artisan migrate --seed`** ( **`WeSharpDemoSeeder`** ), Clerk **staff** user with **`orders.view` + `knives.view` + `orders.update` + `knives.update`** plus AR permissions **`invoices.view`**, **`invoices.create`**, **`payments.view`**, **`payments.manage`** (add **`payments.override`** only when testing excess manual amounts).

Environment: **`NEXT_PUBLIC_API_ORIGIN`** points at Laravel (**`/api`** prefix). Browser session signed in (**Clerk**).

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
