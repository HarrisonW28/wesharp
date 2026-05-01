# Reporting backend (Sprint 8.1)

Structured admin reporting lives behind **`/api/admin/reports/*`**. Business logic sits in **`App\Services\Reports\*`**; **`ReportingController`** only validates input and returns **`ApiResponses::success`**.

Customers never hit these routes (admin API requires **`staff`** middleware). Permissions:

| Permission | Role(s) | Endpoints |
| --- | --- | --- |
| **`reports.finance`** | `super_admin`, `admin`, `finance` | `sales`, `invoices`, `billing`, `subscriptions`, `export` |
| **`reports.operations`** | `super_admin`, `admin`, `route_manager` | `bookings`, `orders`, `routes`, `knives` |

**`analytics.view`** remains separate (existing **`/api/admin/analytics/*`** city-scoped dashboards). Reports add **company_id**, **status**, and **route/driver** filters where relevant.

---

## Request shape

All report actions (except **`export`**) use **`AdminReportRequest`**:

| Query | Notes |
| --- | --- |
| **`date_from`**, **`date_to`** | Optional; default range last **90** days ending today (UTC). |
| **`city`** | Filters via existing model scopes **`whereCompanyCity`**. |
| **`area`** | Route reports only: exact match on **`routes.coverage_city`** (alias for “area”; independent of **`city`**). |
| **`company_id`** | UUID; narrows to one tenant. |
| **`booking_status`**, **`order_status`**, **`invoice_status`**, **`payment_status`**, **`route_status`** | Optional raw status strings. |
| **`failure_reason`** | Route reports only: keep routes that have at least one **skipped** stop whose **`failure_reason`** equals this string (exact). |
| **`knife_status`**, **`knife_type`**, **`service_type`** | Knife report: filter **`knives.knife_status`**, exact **`knives.knife_type`**, and booking **`bookings.service_type`**. |
| **`route_id`**, **`driver_user_id`** | Operational routes / driver filter. |
| **`per_page`**, **`page`** | Table pagination (**1–100** per page). |
| **`bookings_page`**, **`orders_page`** | Optional overrides for **`page`** on **`/reports/bookings`** and **`/reports/orders`** detail tables when both reports load from one UI (defaults to **`page`**). |

---

## Response shape (`data`)

Every report returns:

| Key | Purpose |
| --- | --- |
| **`report`** | Stable key (`sales`, `invoices`, …). |
| **`filters`** | Echo of normalised filters (dates as **Y-m-d**). |
| **`kpis`** | Scalar aggregates only (counts, sums in **pence**). No invented chart values. |
| **`series`** | Breakdowns / time buckets from **real SQL aggregates** (object or list depending on report; may contain empty arrays). |
| **`table`** | `columns`, `rows`, optional **`meta`** (`total`, pagination). Nullable when not used. |
| **`definitions`** | Short metric definitions for UI tooltips / audits. |
| **`export`** | Placeholder until CSV/PDF exists. |

---

## Endpoints

| Method | Path | Permission |
| --- | --- | --- |
| GET | **`/api/admin/reports/sales`** | `reports.finance` |
| GET | **`/api/admin/reports/invoices`** | `reports.finance` |
| GET | **`/api/admin/reports/billing`** | `reports.finance` |
| GET | **`/api/admin/reports/subscriptions`** | `reports.finance` |
| GET | **`/api/admin/reports/export`** | `reports.finance` |
| GET | **`/api/admin/reports/bookings`** | `reports.operations` |
| GET | **`/api/admin/reports/orders`** | `reports.operations` |
| GET | **`/api/admin/reports/routes`** | `reports.operations` |
| GET | **`/api/admin/reports/knives`** | `reports.operations` |

---

## Metric definitions (summary)

- **Sales (`sales`)** — Invoice / payment basis (Sprint 8.2). **`total_revenue_pence`**: accrual sum of **`invoices.total_pence`** for **`issued_on`** in range, excluding **void** and (by default) **draft** unless **`invoice_status`** filter targets them. **`paid_revenue_pence`**: sum of **`payments.amount_pence`** with **`paid_at`** in range on matching non-void invoices; respects **`payment_status`**. **`unpaid_revenue_pence`** / **`outstanding_balance_pence`**: residuals from **`payments`** rollups. **`series.revenue_by_day`**: billed totals by **`issued_on`**. **`series.paid_vs_unpaid`**: collected-on-cohort vs residual. Payload includes **`recent_invoices`** and **`recent_payments`** tables. UI: **`/admin/reports/sales`**.
- **Invoices (`invoices`)** — Rows filtered by **`issued_on`** in range. **`outstanding_residual_pence`**: residual on **outstanding** invoices in that filtered set (total − sum of payments per invoice).
- **Subscriptions (`subscriptions`)** — Counts rows in **`company_subscriptions`**. **Date range does not apply** to subscription master data (documented in **`table.meta`**); use **`company_id`**.
- **Bookings (`bookings`)** — Sprint **8.3** operational throughput. Primary cohort: **`created_at`** in range (plus **`whereCompanyCity`**, **`company_id`**, optional **`booking_status`**). **KPIs:** **`bookings_created_count`**; **`bookings_confirmed_activity_count`** (status confirmed and **`updated_at`** in range); **`bookings_confirmed_audit_count`** (**`booking.confirmed`** audits in range); **`bookings_cancelled_count`**, **`bookings_converted_to_order_count`**, **`bookings_completed_count`** (status + **`updated_at`** in range); **`pending_bookings_pipeline_count`** (non-terminal statuses — **snapshot**, date range **not** applied); **`average_hours_to_confirm`** (mean hours from booking **`created_at`** to confirm audit **`created_at`** for audits in range; **`null`** if none). **Series:** **`bookings_by_day`** (cohort by **`created_at`**), **`booking_status_breakdown`** (status × count × **`price_estimate_pence_sum`**). **`recent_activity`** + paginated **`table`**. UI: **`/admin/reports/operations`**.
- **Orders (`orders`)** — Sprint **8.3**. Primary cohort: **`created_at`** in range. **KPIs:** **`orders_created_count`**; **`active_workshop_orders_count`** (draft → quality_check — **snapshot**, date range **not** applied); **`completed_orders_count`** (**`completed_at`** in range, else **`updated_at`** if **`completed_at`** null); **`cancelled_orders_count`**; **`total_pence_created_cohort`**; **`average_order_value_pence`**; **`average_completion_hours`** (mean **`completed_at` − `created_at`** in hours for completed rows with **`completed_at`** in range; **`null`** if none). **Series:** **`orders_by_day`**, **`order_status_breakdown`**. **`recent_activity`** + paginated **`table`**. Same UI as bookings.
- **Routes (`routes`)** — Sprint **8.4** performance. **Cohort:** **`routes.scheduled_date`** between **`date_from`** and **`date_to`** (inclusive), plus **`route_status`**, **`driver_user_id`**, **`area`/`coverage_city`**, **`failure_reason`** (exists skipped stop), optional **`route_id`**. **KPIs:** **`routes_count`**; **`routes_completed_count`** (**`route_status = completed`**); **`total_stops`** / **`completed_stops`** / **`failed_collections`** ( **`skipped`** = failed collection in this report); **`completion_rate`** (**`completed_stops ÷ total_stops`**, **`null`** if no stops); **`average_stops_per_route`**; **`photos_captured_count`** (non-archived **`evidence_photos`** linked to **`route_stops`** in cohort). **Series:** **`routes_by_day`**, **`route_status_breakdown`**, **`stop_status_breakdown`**, **`failed_collection_reasons`** (top **50** **`failure_reason`** on skipped stops), **`driver_performance`** (rollup by **`driver_user_id`**, including unassigned). **Table:** per-route **`stops_count`**, completed/failed counts, per-route completion rate, photo count. UI: **`/admin/reports/routes`**.
- **Knives (`knives`)** — Sprint **8.5** service volume. **Cohort:** **`knives.updated_at`** in range (+ **`whereCompanyCity`**, **`company_id`**, **`knife_status`**, **`knife_type`**, booking **`service_type`**). **KPIs:** **`knives_activity_count`**; **`knives_completed_workshop_count`** (sharpened / quality_checked / returned); **`knives_in_progress_snapshot_count`** (received / inspected / sharpening / issue_reported — **snapshot**, date **not** applied); **`knives_inspected_count`**; **`sharpened_throughput_count`** (same three output states as existing scope); **`average_knives_per_order`** (cohort rows with **`order_id`** ÷ distinct orders); **`reservice_assignments_count`** (**`knife_service_assignments`** with **`service_kind = reservice`**, **`linked_at`** in range, knife matches filters); **`damage_reports_created_count`** (non-archived, **`created_at`** in range, knife matches filters). **Series:** **`knives_by_day`**, **`knife_type_breakdown`**, **`service_type_breakdown`** (from booking; **`none`** if unlinked), **`knife_status_breakdown`**, **`service_kind_breakdown`** (all assignment kinds by **`linked_at`**), **`top_companies_by_knife_volume`** (max **50**), **`damage_by_severity`**, **`damage_by_status`**. UI: **`/admin/reports/knives`**.
- **Billing (`billing`)** — Sprint **8.6** invoice / payment / AR ageing. **Period cohort:** **`issued_on`** between **`date_from`** and **`date_to`** for KPIs **`invoices_sent_count`** (excludes draft/void), **`invoices_paid_count`**, **`overdue_invoices_period_count`** (status = overdue). **Payments in period:** **`paid_at`** in range, invoice-linked; **`total_paid_pence`**, **`payments_received_count`**, **`series.payment_method_breakdown`**, **`series.payments_by_day`**; optional **`payment_method`** and **`payment_status`** filters. **AR snapshot as of end of `date_to`:** invoices **`issued_on ≤ date_to`**, not draft/void; residual = **`total_pence − SUM(payments.amount_pence)`** for payments with **`paid_at ≤ end of date_to`**. **`unpaid_invoices_snapshot_count`**, **`total_outstanding_pence`**, **`series.ageing`** (outstanding only, buckets vs **`COALESCE(due_on, issued_on)`**), **`series.outstanding_by_customer`** (top **50**), paginated **`unpaid_invoices`** and **`overdue_invoices`** (overdue = due date strictly before as-of calendar day). **`average_days_to_pay`:** mean days from **`issued_on`** to last payment **`paid_at`** for invoices marked paid with **`issued_on`** in range; **`null`** if none. UI: **`/admin/reports/billing`**.

---

## Performance

- Composite indexes (**migration `2026_04_30_250000_reporting_query_indexes`**): **`orders (company_id, updated_at)`**, **`knives (company_id, updated_at)`**, **`invoices (company_id, issued_on)`**.
- List endpoints **paginate** detail tables; KPIs and **`series`** use **aggregates** / **limited** top-N (e.g. sales top companies cap **50**).

---

## Known limitations

- **`GET /api/admin/reports/export`** returns **`available: false`** — no file generation yet.
- Subscription report is **CRM row counts**, not MRR or proration.
- Route **failed collections** are inferred from **`route_stop_status = skipped`** (not a separate “failed” enum).
- **`failure_reason`** filter and breakdown use **exact** string matches; free-text reasons may fragment categories.
- Driver performance uses **`routes.driver_user_id`** only (no multi-driver attribution per stop).
- Knife **activity cohort** is **`updated_at`**-based (not “created” volume); **`service_type`** requires a linked **booking**.
- **`knife_type`** filter and breakdown use stored free-text / categorical **`knives.knife_type`** (exact match on filter).
- **Billing** AR residual ignores payments with **`paid_at`** after the as-of instant; partial payments are reflected. **`invoice_status`** on an invoice row may lag manual bookkeeping (e.g. still **`sent`** while mathematically paid).
- **`analytics`** and **`reports`** may overlap conceptually; keep **city-wide analytics** on **`/analytics/*`** and **filter-rich tabular reports** on **`/reports/*`** until consolidated in a later sprint.

---

## Related

- **`docs/architecture/data-model.md`** — core entities.
- **`docs/product/orders-invoices-payments.md`** — invoice semantics.
