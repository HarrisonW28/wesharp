# Route Manager — user stories (MVP)

These stories mirror the shipped **`(route-manager)`** technician UI and Laravel JSON API.

---

## Today (`/admin/routes/today`)

As a **driver**, I open **Today's route** to see:

- **Today’s date** and aggregated **metrics** (stops completed/total, estimated knives, estimated revenue heuristic).
- **My assigned route** (**`primary_route`**) when my user id equals **`routes.driver_user_id`**; otherwise contextual copy directs me to the full list or ops assignment.
- A **Start route** affordance while the operational route sits in **`scheduled`** ( **`POST …/start`** ).
- Chips / links for **coverage city** plus **runs today** linking to **`/admin/routes/{id}`**.
- Persistent **mobile bottom navigation** for Today / All routes / Bookings where permissions allow.

## All routes (`/admin/routes`)

As **ops or a driver scout**, I can **page** through **`GET /api/admin/routes?paginate=1`** and jump into detail.

Acceptance nuances:

- First page hides **Previous**.
- Rows show **scheduled date**, **status**, **city**, optional **driver** name card — **no cramped tables**.

## Route detail (`/admin/routes/[routeId]`)

As a **technician**, I need:

- A **route progress bar** (**`progress.completed/total`**), **notes**, **assigned driver**.
- Tap-through **ordered stop cards** (company + address excerpt + ETA chips + statuses).
- **Complete route** CTA (**`POST …/complete`**) whenever backend reports **`route_status=in_progress`** and policy passes.

## Stop detail (`/admin/routes/[routeId]/stops/[stopId]`)

Field technician stories:

1. Dial the contact (**`tel:`**) and open **Maps** with the venue query string.
2. Move the stop forward with **large buttons**: travelling → arrived → collected → returned → complete (each hits the corresponding **`POST`** action).
3. Record **actual knife count** and **damage notes** via **`PUT`** (single **Save count & damage** control).
4. See **booking / service type / payment hint** surfaced from Laravel (`payment_status_hint` derivations).
5. Return to the manifest through **Back to route**.

## Permissions stories

- **Viewer with `routes.view` only** can read manifests but receives **403** on driver-only transitions if not assigned.
- **Driver** with **`route_stops.update`** progresses stops on assigned routes **without `routes.manage`**.
- **`routes.manage`** users can reorganise manifests (**`PUT …/reorder-stops`**) and attach stops (**`POST …/stops`**) independently of assignment.
