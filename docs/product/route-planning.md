# Route planning (Sprint 5.1)

Operational **collection / return** runs are modelled as **`routes`** (`OperationalRoute`) with ordered **`route_stops`** linked to **`bookings`**. This sprint adds **planning UX** and **API readiness** — not vehicle routing optimisation.

## Who can access

- **`routes.view`**: list + detail + today board (`super_admin`, `admin`, `route_manager`). **`finance` does not receive `routes.view`** — no route planning UI/API reads.
- **`routes.manage`**: create/update routes, add/remove/reorder stops, driver lookup, `POST /routes/{id}/stops`.
- **`OperationalRoutePolicy::manage`**: start/complete route and stop transitions for the **assigned driver** without `routes.manage`.

## API summary

| Action | Method | Path | Permission |
| --- | --- | --- | --- |
| List (filters) | GET | `/api/admin/routes?paginate=1&…` | `routes.view` |
| Filters | | `date`, `route_status`, `driver_user_id`, `coverage_city` (contains), `q` (name contains) | |
| Today | GET | `/api/admin/routes/today` | `routes.view` |
| Create | POST | `/api/admin/routes` | `routes.manage` |
| Update | PUT | `/api/admin/routes/{route}` | `routes.manage` |
| Add booking as stop | POST | `/api/admin/routes/{route}/stops` `{ booking_id }` | `routes.manage` — uses **`AssignBookingToRouteAction`** (status + `assigned_route_id` kept in sync). |
| Remove stop | DELETE | `/api/admin/routes/{route}/stops/{stop}` | `routes.manage` — only **`not_started`** stops; clears booking assignment when it pointed at this route. |
| Reorder | PUT | `/api/admin/routes/{route}/reorder-stops` `{ stop_ids: [] }` | `routes.manage` — audits **`route.stops_reordered`**. |
| Driver picker | GET | `/api/admin/lookups/route-drivers?q=` | `routes.manage` — active **`super_admin` / `admin` / `route_manager`** users. |

List rows expose **`stops_count`**, **`completed_stops`**, **`incomplete_stops`**, **`route_status_label`**, and **`driver_user_id`** for filters.

## Frontend

- **`/admin/routes`** — filters, pagination, **New route** (when `routes.manage`), columns for done/open stops.
- **`/admin/routes/[routeId]`** — progress, **Edit route** (dialog), **Add booking** (confirmed + unassigned for the route date), **Up/Down** reorder, **Remove** for `not_started` stops.
- **Admin shell** nav: **Route planning** → `/admin/routes`.

## Audit

- `route.created`, `route.updated`, `route.stop_added` (via booking assign), **`route.stop_removed`**, **`route.stops_reordered`**, existing booking **`booking.assigned_route`** / **`booking.route_unassigned`**.

## Known limitations

- No **VRP / sequencing optimisation** — manual ordering only.
- **Driver filter** on the list uses numeric **user id** (lookup API is used on the detail edit dialog).
- **`POST …/stops`** requires booking **confirmed** (or already assigned) and **date / city** rules from **`AssignBookingToRouteAction`**.
