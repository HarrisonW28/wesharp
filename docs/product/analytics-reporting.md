# Analytics & reporting — MVP dashboards

Operational analytics are delivered through **`GET /api/admin/analytics/**`** endpoints and the **`/admin/analytics`** screen. **All GBP amounts are integer pence** on the wire; rounding for averages happens only in Laravel aggregates.

---

## Permissions

Every endpoint stacks **`clerk.auth`**, **`staff`**, and **`permission:analytics.view`**. Roles that include **`analytics.view`** (e.g. `super_admin`, `admin`, `route_manager`, `finance`) can load the dashboard — tenant **`customer_*`** users cannot reach **`/api/admin/*`**.

---

## Filters (`date_from`, `date_to`, optional `city`)

| Query parameter | Behaviour |
| --- | --- |
| **`date_from` / `date_to`** | Inclusive UTC day range for charts and several KPI formulae. Omitting both defaults **`date_to=today`** and **`date_from=today − 90days`** (**`AnalyticsDashboardRequest`**).|
| **`city`** | When set, revenue / knife / bookings series restrict to **`companies.city`** (`orders.company_id`, `knife.company_id`, `booking.company_id`). **Route KPIs** comparing **`routes.coverage_city`** also honour the same literal when analysing route payloads.|

Rolling KPIs (**revenue this month**, **revenue this week**, **knives sharpened this week**, **new bookings this week**) use **calendar windows in UTC**, still filtered by **`city`** when supplied.

---

## Metrics (overview KPIs)

| KPI | Laravel meaning |
| --- | --- |
| **Revenue this month/week** | `SUM(orders.total_pence)` **completed orders** (**`orders.order_status = completed`**) whose **`updated_at`** lies in calendar month/week. |
| **Knives sharpened this week** | Count **`knives`** in **`sharpened`, `quality_checked`, `returned`** with **`updated_at`** in the ISO Monday–Sunday week (UTC boundaries from Carbon). |
| **Average price per knife** | `FLOOR(SUM(total_pence) / SUM(knife_count))` across completed orders between **`date_from`** and **`date_to`**. Zero when denominator zero. |
| **Active customers** | Companies **`company_status`** ∈ **`active`, `trial_completed`, `at_risk`** (optionally city-scoped). |
| **Outstanding invoices / amount** | Invoices **`NOT IN paid, void`**, residue = **`total − SUM(payments.amount_pence)`** via join subqueries. |
| **Overdue amount** | Residual balances on overdue exposure: status **`overdue`** or **`sent`** with **`due_on` < today (UTC)**. |
| **New bookings this week** | **`bookings.created_at`** boundary with city filtering. |

---

## Charts wired in the SPA

| Visual | API source | Aggregation |
| --- | --- | --- |
| **Revenue over time** (`/sales`) | `revenue_daily` | Daily **`DATE(orders.updated_at)`**, completed orders only (**portable **`AnalyticsSql::dateDay`**)**. |
| **Knives sharpened by week** (`/operations`) | `knives_sharpened_by_week` | Week bucket via **`AnalyticsSql::weekBucket`** counting sharpened throughput states. |
| **Revenue by city** (`/sales`) | `revenue_by_city` | Group by **`companies.city`**. |
| **Bookings by status** (`/operations`) | `bookings_by_status` | `GROUP BY booking_status`, **`created_at` window**. |
| **Route value by city** (`/routes`) | `route_value_by_city` | Join **`routes` ↔ orders** (`orders.route_id`) where orders completed — sum **`total_pence`**, keyed by **`routes.coverage_city`**. |
| **Top customers by spend** (`/sales`) | `top_customers_by_spend` | Sum completed orders **`GROUP BY companies.id`** (top 10). |
| **Paid vs open invoices** (`/sales`) | `paid_vs_open_invoices` | Paid totals per invoices created inside window versus outstanding residual aggregates. |

The UI never recomputes these totals—it **formats currency** (`formatGbpFromPence`) from server payloads only.

---

## API endpoints delivered

```
GET /api/admin/analytics/overview
GET /api/admin/analytics/sales
GET /api/admin/analytics/routes
GET /api/admin/analytics/operations
```

Each returns `{ success: true; data: { ... }, meta: ... }` via **`ApiResponses::success`** from **`AnalyticsController`** + **`AnalyticsService`**.

Implementation notes:

- Queries lean on **`Order::scopeCompleted()`**, **`Invoice::scopeOutstanding()`**, **`Knife::scopeSharpenedThroughput()`**, **`Company::scopeAnalyticsActive()`**, and scoped joins—not full-table hydration.
- **SQLite** (PHPUnit) and **MySQL** portability handled in **`AnalyticsSql`** for day/week bucketing expressions.

---

## Known gaps / follow-ups

- **Route chart may be sparse** unless orders expose **`route_id`** in seed data (`route_value_by_city` can return `[]`).
- **MySQL `ONLY_FULL_GROUP_BY`**: additional testing recommended for complex aggregate queries beyond SQLite CI.
- **Exports / BI:** No CSV/PDF; no scheduled snapshots.
- **Real-time dashboards:** Queries are on-demand—not materialised nightly.

See also **`docs/security/permissions-matrix.md`** (`analytics.view`) and **`docs/testing/qa-checklist.md`**.
