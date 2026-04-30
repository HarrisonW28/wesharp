# Customer user stories (MVP anchors)

Stories below map to Laravel permissions + SPA routes surfaced in **`docs/product/customer-portal.md`**. Anything marked **⚠ backlog** intentionally stays out of the MVP shipment.

---

## Booking & fulfilment

- **As an owner**, I request a courier collection (`POST /api/account/bookings`, `/account/bookings/new`) specifying location window, knives estimate, acknowledgement checkboxes — _Done when_ booking persists with **`booking_status = requested`** and acknowledgement footer is appended automatically.  
- **As hospitality staff**, I review upcoming pickups (`GET /api/account/bookings`, `/account/bookings`) sorted by scheduling context — _Done when_ list rows reflect only my venue identifiers.  
- **As hospitality staff**, I inspect a booking timeline summary (`GET /api/account/bookings/{id}`, `/account/bookings/[id]`) without internal estimating chatter — _Done when_ response omits **`internal_notes`** + **`price_estimate`**. ⚠ SLA automation / reschedule UI still backlog.

## Orders & workshop visibility

- **As finance/AP**, I reconcile knife throughput vs invoices using order history (`/account/orders`) — _Done when_ detail view surfaces knives + totals read-only (**`orders.view`** enforced). ⚠ Downloads for weigh tickets remain backlog.

## Invoicing

- **As AP**, I list tenant invoices tied to fulfilment totals (`GET /api/account/invoices`) — _Done when_ rows match `InvoiceJson::listRow`. ⚠ PDF + Stripe link export tracked separately.

## Locations & onboarding

- **As an owner**, I add or revise venue docks (`POST/PUT /api/account/locations`, `/account/locations`) — _Done when_ updates hit only my `company_locations` FK and fail cross-tenant spoofing attempts.

## Profile & coordination

- **As hospitality staff**, I keep switchboard/AP contacts aligned (`GET/PUT /api/account/settings`, `/account/settings`) — _Done when_ allowed fields (**`users.name`, `company.{name,phone,billing_email}`**) persist while Clerk email + CRM-only fields remain read-only/disabled inputs.
