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

