# Booking workflow (MVP — product)

## Purpose

Coordinate **collection / onsite bookings** from **request → field route → workshop order** with a single Laravel API and admin UI. Bookings tie together **accounts (`companies`)**, **sites (`company_locations`)**, optional **contacts**, **operational routes** (`routes` + `route_stops`), and **commercial orders**.

## Lifecycle (high level)

1. **Requested** — intake from admin `POST /api/admin/bookings` (or legacy `POST /api/admin/companies/{id}/bookings`), **customer portal** `POST /api/account/bookings`, or **anonymous** `POST /api/public/booking-enquiries` (creates/updates lead company + location + contact + **Requested** booking — see `docs/product/public-website.md`).
2. **Confirmed** — office accepts the slot (`POST …/confirm`).
3. **Assigned to route** — planner pins the visit to a vehicle run (`POST …/assign-route`); creates/updates a `route_stop`.
4. **Collected → In sharpening → Quality → Returned → Completed** — workshop + field progression (future automation; status graph is enforced centrally).
5. **Cancelled** — `POST …/cancel` when the transition graph allows it; detaches route stop and clears `assigned_route_id`.

## Converting to commerce

`POST …/convert-to-order` materialises a **`orders` row** in **draft** linked by `booking_id` (one order per booking in MVP — duplicate attempts return **422**).

## Relationship to routes

- **`bookings.assigned_route_id`**: convenience pointer to the active `routes` (operational route) row.
- **`route_stops`**: canonical stop per booking on a route (`booking_id`, `route_id`, `sequence`). Assign action creates or updates this link.

## Relationship to orders

- **`orders.booking_id`** (required in schema): financial / ops order created from a booking.
- A booking may exist without an order until conversion or downstream seed data.

## Invalid moves (central rules)

See `App\Support\Bookings\BookingStatusTransitions`. Random `PUT` status flips are **rejected** (`prohibited` in `UpdateBookingRequest`); only lifecycle endpoints change `booking_status`.

## Picker APIs

- **`GET /api/admin/routes?date=Y-m-d`** — slim list for **Assign to route** dialogs (`ROUTES_VIEW`).

## Known gaps / follow-ups

- Bulk reschedule, recurring visits, SLA dashboards.
- Automated progression from route-stop GPS events → booking status (today manual / seed-driven).
- Delete `DELETE /api/admin/bookings/{id}` returns **501** — cancellations preferred.
- Public enquiries depend on **CORS** for cross-origin marketing domains; tighten `config/cors.php` per environment.
