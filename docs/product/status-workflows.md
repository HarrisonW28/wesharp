# Status workflows (implemented enums)

All values are `**App\Enums\*.php**` `string`-backed enums — **avoid hardcoding literals** outside tests; use enums in application code (`FooStatus::Active`, etc.).

---

## Company — `CompanyStatus`


| Case             | Stored value      |
| ---------------- | ----------------- |
| `Lead`           | `lead`            |
| `TrialBooked`    | `trial_booked`    |
| `TrialCompleted` | `trial_completed` |
| `Active`         | `active`          |
| `AtRisk`         | `at_risk`         |
| `Lost`           | `lost`            |
| `DoNotContact`   | `do_not_contact`  |


**Column:** `companies.company_status`

---

## Booking — `BookingStatus`


| Case              | Stored value        |
| ----------------- | ------------------- |
| `Requested`       | `requested`         |
| `Confirmed`       | `confirmed`         |
| `AssignedToRoute` | `assigned_to_route` |
| `Collected`       | `collected`         |
| `InSharpening`    | `in_sharpening`     |
| `QualityChecked`  | `quality_checked`   |
| `Returned`        | `returned`          |
| `Completed`       | `completed`         |
| `Cancelled`       | `cancelled`         |
| `NoShow`          | `no_show`           |


**Column:** `bookings.booking_status`

### Implemented transitions (centralised)

Authoritative graph: `App\Support\Bookings\BookingStatusTransitions` (used by confirm/cancel/assign; `PUT` payloads **cannot** set `status` — `UpdateBookingRequest` blocks it).

**Allowed single-hop moves**

- `requested → confirmed` (confirm action) or `requested → cancelled`.
- `confirmed → assigned_to_route` (assign-route) or `confirmed → cancelled`.
- `assigned_to_route → collected` or `assigned_to_route → cancelled` (field/future automation; not all exposed as API buttons yet).
- `collected → in_sharpening` … through `returned → completed` plus `returned → no_show` as per enum.

**Generally invalid / blocked**

- Jumping backwards (e.g. `completed → requested`) without bespoke tooling.
- Cancelling from terminal states such as **`completed`**, **`cancelled`**, **`returned`**, **`no_show`** (abort **422**).

**Related actions**

- **`POST /api/admin/bookings/{id}/assign-route`**: requires **`bookings.update` + `routes.manage`**; route `scheduled_date` must match booking **`requested_date`** (stored as `scheduled_date` column).
- **`POST …/convert-to-order`**: allowed from **`confirmed`**, **`assigned_to_route`**, **`collected`** if no order exists; requires **`orders.create`**.

---

## Operational route (`routes` table) — `OperationalRouteStatus`


| Case         | Stored value  |
| ------------ | ------------- |
| `Draft`      | `draft`       |
| `Scheduled`  | `scheduled`   |
| `InProgress` | `in_progress` |
| `Completed`  | `completed`   |
| `Cancelled`  | `cancelled`   |


**Column:** `**routes.route_status`** (PHP model: `**OperationalRoute**`)

### Transitions (centralised)

Authoritative graph: `App\Support\Routes\OperationalRouteTransitions` ( **`StartRouteAction`**, **`CompleteRouteAction`** ); `PUT` must not set **`route_status`** (**`UpdateOperationalRouteRequest`** prohibits mass status changes).

**Allowed single-hop moves**

- `draft → scheduled | cancelled`
- `scheduled → in_progress | cancelled` (`POST …/start`)
- `in_progress → completed | cancelled` (`POST …/complete`)

**API (admin)**

- `POST /api/admin/routes/{route}/start` → `scheduled → in_progress`
- `POST /api/admin/routes/{route}/complete` → `in_progress → completed`

**Policy:** **`OperationalRoutePolicy::manage`** allows assigned **driver** (`driver_user_id`) with `routes.view`, or any user with **`routes.manage`**. Structural edits (reorder stops, add stops) require **`routes.manage`** via **`OperationalRoutePolicy::update`**.

---

## Route stop — `RouteStopStatus`


| Case           | Stored value    |
| -------------- | --------------- |
| `NotStarted`   | `not_started`   |
| `Travelling`   | `travelling`    |
| `Arrived`      | `arrived`       |
| `Collected`    | `collected`     |
| `InSharpening` | `in_sharpening` |
| `Returned`     | `returned`      |
| `Completed`    | `completed`     |
| `Skipped`      | `skipped`       |


**Column:** `route_stops.route_stop_status`

### Transitions (centralised)

Authoritative graph: `App\Support\Routes\RouteStopTransitions` — each hop is performed by a dedicated **`App\Actions\Routes\Mark*Action`** or **`CompleteRouteStopAction`**; `PUT` patches only **`actual_knife_count`** / **`damage_notes`** (**`UpdateRouteStopRequest`** prohibits **`route_stop_status`** in the body).

**Typical field path (API)**

- `not_started → travelling → arrived → collected → returned → completed`
- From **`collected`** the graph also allows **`in_sharpening`** (workshop); the mobile technician UI surfaces **mark returned** directly for on-vehicle flows.

**API (admin)**

- `POST /api/admin/route-stops/{stop}/mark-travelling`
- `POST …/mark-arrived`
- `POST …/mark-collected`
- `POST …/mark-returned`
- `POST …/complete`

**Policy:** **`RouteStopPolicy::manage`** — requires **`route_stops.update`** plus either assigned route **driver** (`routes.view`) or **`routes.manage`** for full override.

---

## Knife — `KnifeStatus`


| Case             | Stored value      |
| ---------------- | ----------------- |
| `Logged`         | `logged`          |
| `Collected`      | `collected`       |
| `Inspected`      | `inspected`       |
| `Sharpened`      | `sharpened`       |
| `QualityChecked` | `quality_checked` |
| `Returned`       | `returned`        |
| `IssueReported`  | `issue_reported`  |


**Column:** `knives.knife_status`

### Transitions (centralised)

Authoritative graph: **`App\Support\Knives\KnifeStatusTransitions`**. Mutation actions (**`MarkKnifeInspectedAction`**, **`Sharpened`**, **`QualityChecked`**, **`Returned`**, **`ReportKnifeIssueAction`**) use **`MarkKnifeTrait::transitionKnife`** inside a **`DB::transaction`**, **`KnifeStatusTransitions::assertCan($from, $to)`** on invalid hops → **422**, and **`AuditRecorder::record`** for every transition (payload includes `from` / `to`).

**Representative hops**

- **`logged`** → `collected`, `inspected`, `issue_reported`
- **`inspected`** → `sharpened`, `issue_reported`
- **`quality_checked`** → `returned`, `issue_reported`
- **`issue_reported`** → `inspected` or `sharpened` (resume workshop)
- **`returned`** → terminal (empty edges)

**API (admin)** — **`POST`** on `/api/admin/knives/{knife}/…`

- **`mark-inspected`**, **`mark-sharpened`**, **`mark-quality-checked`**, **`mark-returned`**, **`report-issue`** — require **`KnifePolicy::transition`** ⇒ **`knives.update`** scoped to **`company_id`**.

---

## Order — `OrderStatus`


| Case        | Stored value |
| ----------- | ------------ |
| `Draft`     | `draft`      |
| `Active`    | `active`     |
| `Completed` | `completed`  |
| `Cancelled` | `cancelled`  |


**Column:** `orders.order_status`

### Transitions (centralised)

Authoritative graph: **`App\Support\Orders\OrderStatusTransitions`**. Operational completion uses **`CompleteOrderAction`** (invoked by **`POST /api/admin/orders/{order}/complete`**) inside a DB transaction alongside order-side effects; **`OrderStatus`** is not bulk-assigned on **`PUT`** ( **`UpdateOrderRequest`** blocks **`order_status`** ).

**Allowed single-hop moves**

- `draft → active | completed | cancelled`
- `active → completed | cancelled`
- **`completed`** and **`cancelled`** are terminal (`[]` outward edges).

**API (admin)**

- **`POST …/complete`**: **`complete`** policy (**`orders.update`** per **`company_id`**) transitions toward **`completed`** when allowed.

---

## Invoice — `InvoiceStatus`


| Case      | Stored value |
| --------- | ------------ |
| `Draft`   | `draft`      |
| `Sent`    | `sent`       |
| `Paid`    | `paid`       |
| `Overdue` | `overdue`    |
| `Void`    | `void`       |


**Column:** `invoices.invoice_status`

---

## Payment — `PaymentStatus`


| Case         | Stored value  |
| ------------ | ------------- |
| `Unpaid`     | `unpaid`      |
| `PartPaid`   | `part_paid`   |
| `Paid`       | `paid`        |
| `Overdue`    | `overdue`     |
| `Refunded`   | `refunded`    |
| `WrittenOff` | `written_off` |


**Column:** `payments.payment_status`

**Note:** Naming reflects invoice-level settlement state rather than PSP event names alone.

---

## Service type — `ServiceType`


| Case         | Stored value |
| ------------ | ------------ |
| `Collection` | `collection` |
| `Onsite`     | `onsite`     |


**Columns:** e.g. `bookings.service_type`, `pricing_rules.service_type` (nullable on rules).

---

## Payment method — `PaymentMethod`


| Case           | Stored value    |
| -------------- | --------------- |
| `Card`         | `card`          |
| `BankTransfer` | `bank_transfer` |
| `Cash`         | `cash`          |
| `Stripe`       | `stripe`        |
| `Manual`       | `manual`        |


**Column:** `payments.payment_method`

---

## Related

- `**docs/architecture/data-model.md`** — table/column mapping  
- `**docs/product/module-map.md**` — areas not yet enforced in application logic

