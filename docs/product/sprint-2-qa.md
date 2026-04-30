# Sprint 2 — QA checklist and known limitations

Scope: customer-facing MVP polish, booking/route/order/knife workflows, GBP display, and invoice draft on order completion.

## Smoke checklist

### Public site

- [ ] Home hero reads as a knife-sharpening business (no admin/ops jargon in primary CTAs).
- [ ] “Request a pickup”, pricing, and how-it-works explain the service in plain language.
- [ ] Signed-out users see register/sign-in; signed-in users see “Go to my workspace”.
- [ ] Monetary examples use GBP with pence where shown (e.g. £49.00).

### Customer portal (`/account/*`)

- [ ] Dashboard uses friendly headings (“Your kitchen overview”) and avoids internal operational wording.
- [ ] Bookings, orders, and invoices still load; amounts render as £x.xx via `formatGbpFromPence`.

### Auth and roles

- [ ] New Clerk users receive `customer_owner` by default (`config/clerk.php` / `CLERK_DEFAULT_USER_ROLE`).
- [ ] Customer accounts cannot open `/admin/*` (existing middleware/layout gates).
- [ ] Internal staff retain full admin capabilities where their Laravel role allows.

### Bookings (admin)

- [ ] Booking detail shows **requested** and **confirmed** collection date/time windows when present.
- [ ] “Assign to route” loads routes for **confirmed collection date, else requested** (aligned with `AssignBookingToRouteAction`).
- [ ] If no route exists for that date, an amber hint links to Routes.
- [ ] Convert to order navigates to the new order detail page.
- [ ] Order links in the booking detail use status + GBP, not raw UUID emphasis.

### Orders and knives (admin)

- [ ] Bulk add and single add knives still work.
- [ ] **Attach existing knife** lists unassigned knives for the order’s company (`unassigned_only=1`).
- [ ] Completing an order with **Create draft invoice** checked calls `POST .../complete` with `invoice_draft: true` and surfaces invoice feedback (requires `invoiceFromOrder` permission — otherwise request fails; uncheck the box).
- [ ] Knife detail: upload image on `/api/admin/knives/{id}/photos`; metadata appears in the list (files stay on API disk; **no public URL / tenant download** in this MVP).

### Analytics (admin dashboard)

- [ ] Revenue chart Y-axis uses formatted GBP with decimals (not rounded integer pounds).

## Known limitations (Sprint 2)

1. **Knife photos**: Stored on the API `local` disk; the UI lists filenames/size only — no signed download URLs, email, or customer gallery link yet.
2. **Invoice draft on complete**: Requires permission; SuperAdmin/Admin/Finance typically OK — others should untick the checkbox.
3. **Attach knife**: Picker loads up to 100 unassigned knives for the company; very large inventories may need server-side search (future).
4. **Public pickup form** (`/book`): Still an enquiry flow if the backend is wired that way — confirm environment `NEXT_PUBLIC_API_ORIGIN` for live submits.
5. **Pricing figures** on marketing pages are illustrative until a catalogue/pricing API exists.

## Architecture notes

- Laravel remains source of truth for roles and permissions; Clerk is authentication only.
- Booking route assignment date logic: `confirmed_collection_date ?? requested_collection_date ?? scheduled_date` must match the operational route’s `scheduled_date`.
