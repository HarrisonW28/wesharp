# Route Manager (mobile ops MVP)

Technician-facing **route manifests** (`routes` rows) with ordered **stops** (`route_stops` linked to bookings). Implementation spans Laravel admin JSON and the **`(route-manager)`** Next.js segment.

---

## Route lifecycle (`OperationalRouteStatus`)

Authoritative transitions: **`App\Support\Routes\OperationalRouteTransitions`**.

| From → To | Trigger |
| --- | --- |
| `draft` → `scheduled` / `cancelled` | Scheduling / discard (mostly back-office seeding today) |
| `scheduled` → `in_progress` | **`POST /api/admin/routes/{route}/start`** (`StartRouteAction`) |
| `in_progress` → `completed` | **`POST /api/admin/routes/{route}/complete`** (`CompleteRouteAction`) |
| Most states → `cancelled` | Back-office tooling (minimal UI in MVP) |

**Permissions**

- **`routes.view`** — list routes, **`GET routes/today`**, **`GET routes/{route}`**, **`GET route-stops/{stop}`**
- **`routes.manage`** — create/update route metadata, reorder stops (`PUT …/reorder-stops`), attach stops (`POST …/stops`), start/complete if not driver-only workflows
- **Assigned driver** (`routes.driver_user_id` = JWT user): **`OperationalRoutePolicy::manage`** grants **`POST …/start`** and **`POST …/complete`** without **`routes.manage`**

Mass **`route_status`** changes via **`PUT /api/admin/routes/{route}`** are intentionally blocked (**`route_status`** is **prohibited** on **`UpdateOperationalRouteRequest`**).

---

## Route stop lifecycle (`RouteStopStatus`)

Authoritative transitions: **`App\Support\Routes\RouteStopTransitions`**.

Default technician path surfaced in UI:

`not_started` → **`mark-travelling`** → **`mark-arrived`** → **`mark-collected`** → **`mark-returned`** → **`complete`**

Warehouse step **`in_sharpening`** exists in the graph but is **not** exposed as a dedicated API button on the mobile MVP (can be reached via bespoke tooling later).

Patch-only updates **`PUT /api/admin/route-stops/{stop}`** accept **`actual_knife_count`** and **`damage_notes`** (free-text damage).

**Permissions**: **`route_stops.update`** plus either assigned **driver** on the stop’s route or **`routes.manage`**.

---

## API surface (implemented)

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/admin/routes` | Slim picker (**default**): optional `date=`; **`{ success, data: { items } }`**. Pagination: include `paginate`, `page`, or `per_page`. |
| `POST` | `/api/admin/routes` | Creates route (`routes.manage`). |
| `GET` | `/api/admin/routes/today` | Today’s **`date`**, **`primary_route`** for current user if **`driver_user_id`** matches, list + aggregated **`metrics`**. |
| `GET` | `/api/admin/routes/{route}` | Route detail incl. ordered **`stops`**, **`notes`**, **`assigned_staff`**, **`progress`**. |
| `PUT` | `/api/admin/routes/{route}` | Metadata (**`routes.manage`**). |
| `POST` | `/api/admin/routes/{route}/start` | `StartRouteAction` (**driver** or **`routes.manage`**). |
| `POST` | `/api/admin/routes/{route}/complete` | `CompleteRouteAction` (**driver** or **`routes.manage`**). |
| `POST` | `/api/admin/routes/{route}/stops` | **`booking_id`** body; validates booking date ↔ route date (**`routes.manage`**). |
| `PUT` | `/api/admin/routes/{route}/reorder-stops` | **`{ "stop_ids": ["uuid", ...] }`** — multiset must match (**`ReorderRouteStopsAction`**, **`routes.manage`**). |
| `GET` | `/api/admin/route-stops/{stop}` | `RouteFormatting::stopDetail` (+ payment hint from first **`Order` → Invoice** chain). |
| `PUT` | `/api/admin/route-stops/{stop}` | Knife count / damage (**`route_stops.update`** driver or manage). |
| `POST` | `/api/admin/route-stops/{stop}/mark-travelling` … `/complete` | Discrete actions (**`route_stops.update`** driver or manage). |

**Action classes**: `StartRouteAction`, `CompleteRouteAction`, `ReorderRouteStopsAction`, `MarkRouteStopTravellingAction`, `MarkRouteStopArrivedAction`, `MarkRouteStopCollectedAction`, `MarkRouteStopReturnedAction`, `CompleteRouteStopAction`.

---

## Mobile UI behaviour

- Screens live under **`src/app/(route-manager)/admin/routes/**`** using **`RouteManagerShell`** (`max-w-md` column, slate mobile palette, **`MobileBottomNav`**).
- **Large tap targets**, stop cards stacked (no table layout on phones).
- **`stickyFooter`** slot positions primary CTAs **above** bottom navigation.
- **Toast feedback** (**`sonner`**) after mutations.
- Technician layout uses **`StaffRouteGate`** without the wide **`AdminChrome`** sidebar ( **`(route-manager)/admin/layout.tsx`** ).

Related PWA artefacts: **`src/app/manifest.ts`**, **`public/icons/README.txt`**, **`/offline` placeholder**.

---

## Known gaps / follow-ups

- No service worker caching yet (**`/offline`** is copy-only).
- Launcher icons omitted until brand assets ship (see **`public/icons/README.txt`**).
- No drag-and-drop stop reorder UI (API exists).
- No “skip stop” technician button ( **`skipped`** status transitions exist server-side ).
- Estimated revenue on **`routes/today`** sums order totals falling back to **`price_estimate_pence`** per booking heuristic — not accounting tax splits.
