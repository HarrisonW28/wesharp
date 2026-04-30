# Knife tracking — product (MVP)

Workshop MVP: **every blade** registered on an order carries a **`tag_id`**, persists **`knife_status`** over time, records **who acted** (`sharpened_by_user_id`, `quality_checked_by_user_id`, `returned_by_user_id` on the `knives` table), and emits an **immutable audit timeline** derived from **`audit_logs`** filtered to **`App\Models\Knife`**.

---

## Lifecycle (workshop blade)

Rough happy path:

1. **Logged / registered** when created from an order ( **`POST …/orders/{order}/add-knife`**, **`POST …/orders/{order}/bulk-add-knives`**, or **`POST …/knives`** with **`order_id`** ). **`KnifeService::allocateTagId`** generates **`tag_id`** (never client-supplied beyond optional description metadata).
2. **Collected / inspected → sharpened → quality_checked → returned** driven by **`POST`** transition endpoints (**`MarkKnife*` actions**) or **Issue reported** for exceptions.
3. **Issue (`issue_reported`)** can unwind to **`inspected`** or **`sharpened`** per **`KnifeStatusTransitions`**.

Operational meaning of each **`KnifeStatus`** value is enumerated in **`docs/product/status-workflows.md`** § Knife.

---

## Tagging process

- **Canonical ID:** **`knives.tag_id`** (unique index) — auto-generated backend pattern (order-scoped prefix + entropy to avoid collisions).
- **Purpose:** barcode/label reference for floor scanning; **never** reused after delete (soft-delete not in MVP knife rows).
- **Search:** **`GET /api/admin/knives?tag_id=`** substring match; **`q`** also searches **`description`** / **`label`**.

---

## Status transitions & enforcement

Single source of truth for allowed hops: **`App\Support\Knives\KnifeStatusTransitions`** — invalid hops **abort 422**.

Every transition:

- Wrapped in **`DB::transaction`** in **`MarkKnifeTrait`**.
- **Audit logging** via **`AuditRecorder::record`** **`knife.*`** payload including **`from`** / **`to`**.

Frontend **`src/lib/knife-status-workflow.ts`** mirrors the graph so buttons only appear when hops are theoretically valid; backend remains authoritative.

---

## Screens built (admin)

| Screen | Route | Behaviour |
| --- | --- | --- |
| Order list | `/admin/orders` | Paginated **`GET /api/admin/orders`**, create dialog (**`orders.create`**), loading / empty / error + retry |
| Order detail | `/admin/orders/[orderId]` | Totals & knives; **bulk add knives**, **add one knife**, **complete order**; links to knives |
| Knife list | `/admin/knives` | Filters (**`tag_id`**, **`q`**, **`status`**, **`company_id`**, **`order_id`**), pagination, **`company_name`** column |
| Knife detail | `/admin/knives/[knifeId]` | Workflow **`POST`** buttons + **report issue**, damage list, **`timeline`** audit feed |

Protected by Clerk **staff** middleware; permissions via **`navigation.ts`** (**`orders.view`**, **`knives.view`**).

---

## API endpoints implemented

Base URL: **`/api/admin`** (Laravel **`routes/api.php`**, prefixed by **`api`** globally).

Orders: **`GET|POST /orders`**, **`GET|PUT /orders/{order}`**, **`POST …/complete`**, **`POST …/add-knife`**, **`POST …/bulk-add-knives`**.

Knives: **`GET|POST /knives`**, **`GET|PUT /knives/{knife}`**, **`POST …/mark-{inspected,sharpened,quality-checked,returned}`**, **`POST …/report-issue`**.

---

## Permissions required

| Action | Laravel permission (`Permissions.php`) | Policy hook |
| --- | --- | --- |
| List / view orders | `orders.view` | **`OrderPolicy::viewAny`** / **`view`** (company scoped for customers). |
| Create order | `orders.create` | **`OrderPolicy::create`** |
| Update order / complete / knives on order | `orders.update` + `knives.update` for manifests | **`manipulateKnives`** ⇒ both per **`company_id`** |
| List / view knives | `knives.view` | **`KnifePolicy`** |
| Transition / edit attributes | `knives.update` | **`KnifePolicy::transition`**, **`update`** |

Customer portal users (**`tenant`** routes) cannot hit **`/api/admin/*`**.

---

## Audit behaviour

- **Knife transitions:** **`audit_logs`** rows with **`auditable_type = Knife`**, **`action`** like **`knife.mark_inspected`**, **`knife.report_issue`**, payloads with **`from`** / **`to`**.
- **Knife PUT (attributes):** **`knife.updated`** logged with before/after field snapshot where applicable (**`KnifeService::updateAttributes`**).
- **Order operations:** **`order.created`**, **`order.updated`**, completions via **`OrderService`** (**`AuditRecorder`** on create/update/complete/add knife paths).

**Knife JSON detail:** **`timeline`** array from **`audit_logs`** (joined actor), plus **`damage_reports`**.

---

## Known gaps / follow-ups

- No mobile scanner integration (camera / Bluetooth) — **`tag_id`** search is manual/filter only.
- **Customer-facing** blade status ( **`/account`** ) not in this MVP; admin-only.
- **Bulk CSV** import / re-tagging tooling not shipped.
- **Offline** caching for technician floor app not wired to knife APIs.
