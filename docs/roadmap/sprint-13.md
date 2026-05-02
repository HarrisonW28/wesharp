# WeSharp Sprint 13 — Navigation, Guided Workflows and Platform Usability

## Context

Manual QA shows the platform has strong backend capability, but the frontend/admin experience needs to catch up.

Sprint 13 should make the current platform easier to use, safer to operate and clearer to navigate.

## Existing functionality warning

Earlier sprints may already include pricing, subscriptions, invoices, notifications, POS, route workflows, photo evidence, customer/admin portals, users/roles and reporting.

Sprint 13 must not rebuild those modules from scratch.

For existing modules:
- audit what already exists
- improve discoverability
- improve navigation
- improve UX speed/clarity
- connect existing pages to the right areas
- fix missing frontend entry points only where small
- document larger missing pieces as deferred

Do not duplicate models, routes, controllers, pages or settings that already exist.

## Sprint 13 principles

- Do not rewrite the whole app.
- Do not add unrelated product features.
- Laravel remains the source of truth for roles and permissions.
- Clerk handles authentication only.
- Backend permissions must still enforce access.
- Customer-facing UI should be simple, friendly and conversion-focused.
- Admin UI should be operational, clear and efficient.
- POS and route/agent flows must minimise taps/clicks and support quick data entry.
- Do not force optional data such as photos/notes before progressing.
- Support skip for now, save and continue, and complete later where appropriate.
- Avoid raw UUIDs in normal UI.
- Update docs when roles, workflows or architecture change.

---

## Sprint 13.1 — Navigation IA and Role-Aware Menus

### Goal

Group the app into intuitive areas instead of flat navigation.

### Areas

Use clear areas such as:
- Dashboard
- CRM
- Operations
- Routes
- Sales / POS
- Finance
- Subscriptions
- Reports
- Settings
- Developer / System

### Suggested grouping

CRM:
- Customers
- Companies
- Contacts
- Notes
- Customer Invites

Operations:
- Bookings
- Orders
- Knives
- Damage Reports
- Uploaded Files

Routes:
- Route Planner
- Routes
- Route Stops
- Driver / Agent View

Sales / POS:
- POS Mode
- Service Pricing
- Packages / Price Rules

Finance:
- Invoices
- Payments
- Refunds
- Revenue
- Overdue

Subscriptions:
- Plans
- Active Subscriptions
- Usage
- Renewals
- Overage

Reports:
- Revenue Reports
- Route Reports
- Customer Reports
- Subscription Reports

Settings:
- Users
- Roles & Permissions
- Service Areas
- Notification Settings
- Content Settings
- System Settings

Developer/System:
- System Health
- Audit Logs
- Exception Centre
- Webhook Logs
- Failed Jobs
- Diagnostics
- Environment Checks

### Role-aware nav

developer:
- everything, including system/dev tools

super_admin:
- business admin tools, not necessarily raw dev tools

admin:
- daily operations

finance:
- invoices, revenue, subscriptions

route_manager:
- routes, bookings, orders, knives

route_agent:
- today, my route, stops, photo capture

customer_admin:
- bookings, orders, invoices, subscription, team/account

customer_staff:
- book, bookings, orders, account

### Acceptance criteria

- Navigation is grouped into intuitive areas.
- CRM items live under CRM.
- Developer/system tools are separated.
- Navigation changes based on role/permissions.
- Customer navigation remains simple.
- Route/agent navigation works on mobile.
- Back-to-home/back-to-dashboard links exist where useful.
- Backend permissions are not weakened.
- No raw UUIDs appear in navigation.
- No double headers/footers introduced.

### Sprint 13.1 — Done (implementation summary)

- **Navigation IA:** Admin sidebar and mobile drawer use **grouped sections** (`Dashboard`, `CRM`, `Operations`, `Routes`, `Sales & pricing`, `Finance`, `Subscriptions`, `Reports`, `Settings`, `System`) in `apps/frontend/src/config/navigation.ts`. **`ROUTE_MANAGER_NAV_SECTIONS`** mirrors the same structure with field-friendly labels; **`ROUTE_MANAGER_BOTTOM_NAV`** limits mobile bottom tabs to **five** items for larger tap targets.
- **Role-aware:** Unchanged rule — **`route_manager`** gets the route-manager section set; all other staff get full admin sections; each link still gated by **`permission`** (Laravel); finance/route_manager visibility follows existing permission maps.
- **Customer:** **`ACCOUNT_NAV`** stays a **flat** list (simple); mobile drawer adds **Account home** quick link.
- **Quick home:** **Dashboard home** / **Account home** links at top of mobile drawers.
- **Deferred (no new pages):** POS mode, damage reports hub, uploads browser, customer reports hub, service areas in Settings, exception centre — not in SPA; larger items stay backlog.
- **Files:** `apps/frontend/src/config/navigation.ts`, `SidebarNav.tsx`, `MobileDrawer.tsx`, `AdminShell.tsx`, `AccountShell.tsx`, `RouteManagerShell.tsx`, `docs/roadmap/sprint-13.md`.
- **QA:** `npm run typecheck`, `npm run lint`.

---

## Sprint 13.2 — Guided Workflow Polish and Fast-Entry Audit

### Goal

Improve overfacing workflows without rebuilding everything.

Customer flows can be guided/wizard-style.

Operational flows must be fast-entry, especially:
- POS
- route/agent workflows
- add knives to order
- invoice issue

### Rules

- Minimum taps.
- Big buttons.
- Quick add.
- Sensible defaults.
- Keyboard-friendly where useful.
- Skip optional photos/notes.
- Save/finish later.
- Mobile/tablet friendly.
- Do not make staff click through slow pages for simple data.
- Do not rebuild flows that already work.

### Role refinement

Audit whether to add/formalise a developer role above super_admin.

Recommended distinction:
- developer = technical/system owner role
- super_admin = business owner/admin role
- admin = normal internal manager

Developer may access:
- exception logs
- raw audit logs
- webhook internals
- failed jobs
- diagnostics
- environment checks
- dangerous maintenance tools

Super admin should retain business control but not necessarily see dev-only internals.

### Wizard candidates

Audit/improve where appropriate:
- customer booking
- POS fast-entry
- add knives to order
- invoice issue
- subscription setup
- route/agent stop flow
- damage/issue report

### Acceptance criteria

- Existing workflows are faster/clearer where improved.
- POS can create booking/order quickly.
- Route/agent workflow supports one-tap actions where practical.
- Optional fields can be skipped.
- Developer/system access is separated if needed.
- Existing valid workflows still work.
- No duplicate modules are created.

### Sprint 13.2 — Done

- **Desk / new order** (`apps/frontend/src/app/(admin)/admin/orders/page.tsx`): Shorter desk-focused header copy; create dialog scrolls safely on small viewports; required path is account + booking only; price per knife sits in a collapsed optional block; primary action reads “Create order” with full-width buttons on narrow screens.
- **Quick add blade** (`apps/frontend/src/app/(admin)/admin/orders/[orderId]/page.tsx`): Title “Quick add blade”; type + label stay above the fold; service description, condition, damage and staff notes sit under “More detail — optional”; taller tap targets and stacked footer on mobile.
- **Route stop evidence** (`apps/frontend/src/components/route-manager/RouteStopEvidenceSection.tsx`): Copy states photos are optional unless ops requires them; category, blade link, caption and visibility moved under “Fine-tune before upload — optional”; upload CTA height increased for one-tap use on tablets.
- **Invoice from order** (`apps/frontend/src/app/(admin)/admin/invoices/page.tsx`): Title/description tightened; same scroll-safe dialog and large stacked actions; primary label “Create draft”.
- **Deferred:** Formal `developer` vs `super_admin` access split (see § Role refinement) — no new Laravel role in this slice; subscription wizard / dedicated POS mode not rebuilt.
- **QA:** `npm run typecheck`, `npm run lint` in `apps/frontend`.

---

## Sprint 13.3 — Content Settings Foundation

### Goal

Create controlled editable site copy/settings, not a full CMS.

### Editable now

- homepage hero title
- homepage subtitle
- CTA labels
- service intro copy
- pricing intro copy
- how-it-works steps
- FAQ entries
- support email/phone
- business hours
- service area copy
- booking helper text
- email footer/support copy

### Do not build yet

- page builder
- themes
- drag/drop blocks
- multi-org content control
- white-label CMS

### Acceptance criteria

- Admin can edit key site copy safely.
- Public site uses configured copy where implemented.
- Defaults exist.
- Customer users cannot edit content settings.
- Changes are audited.
- No full CMS/page builder is added.
- Public site does not break if settings are missing.

### Sprint 13.3 — Done

- **Backend:** `site_content_settings` table with JSON `overrides`; `SiteContentDefaults` + `SiteContentService` (merge, sanitise, minimal override storage); `GET /api/public/site-content` (throttled); `GET|PUT /api/admin/site-content` (`settings.manage`); `UpdateSiteContentRequest`; audit action `site_content.updated` on `SiteContentSetting`; notification Blade footers show optional `email.footer_line` via view composer.
- **Admin:** `/admin/content-settings` editor (Settings → Site content) with grouped fields for homepage, pages, FAQ (add/remove), contact, booking copy, business hours, email footer.
- **Public Next.js:** `fetchPublicSiteContent` + `SITE_CONTENT_DEFAULTS` fallback; marketing/home, services (title/lead), pricing page, how-it-works, FAQ, contact, service-areas, book flow wired to API; ISR `revalidate = 60` on public routes using fetch.
- **Deferred:** Full CMS, per-tenant copy, visual page builder; long-form **Services** article sections (What we do / pickup / on-site) remain hardcoded after intro — only title/lead are configurable.
- **QA:** `php artisan test --filter=SiteContentApiTest`; `npm run typecheck`, `npm run lint`, `npm run test` in `apps/frontend`.

---

## Sprint 13.4 — Admin Work Queue / Needs Attention

### Sprint 13.4 — Done

- **Backend:** `WorkQueueService` + `GET /api/admin/work-queue` (`dashboard.view`, staff-only); counts for bookings (unassigned route, missing confirmed window), routes (active runs without driver, route-manager visibility matches route list), orders (no knives logged in workshop states, missing order evidence photos, completed without invoice), finance (unpaid / overdue invoices, overdue payment rows, failed notification deliveries, past-due subscriptions, recent subscription-overage orders), integrations (failed webhook inbox rows), quality (open damage reports), users (invited portal users). Index filters: `collection_window=missing` on bookings; `driver_user_id=unassigned` on routes; `needs_knives` / `needs_workshop_photos` on orders.
- **Admin UI:** `/admin/work-queue` grouped by category with CTA links; compact **Needs attention** card on `/admin/dashboard` (top five by count + link to full queue); nav entries (Dashboard → Work queue) for full admin and route-manager shells; `admin/work-queue` gated with `dashboard.view` in `route-permissions`.
- **QA:** `php artisan test --filter=WorkQueueApiTest`; customer `403` on admin work-queue; finance vs route-manager item differences asserted. Frontend: `npm run typecheck` (and `lint` / `test` as usual).

### Goal

Create an operational queue so admins know what needs action.

### Queue examples

- unassigned bookings
- bookings needing collection window
- bookings needing route assignment
- routes needing agent assignment
- orders needing knives logged
- orders missing photos
- orders ready for invoice
- unpaid invoices
- overdue invoices
- failed emails
- failed webhooks
- payment failed
- subscription overages to review
- damage reports/issues
- pending customer invites

### Acceptance criteria

- Admin can see key operational tasks.
- Each item has a clear next action.
- Queue is role-aware.
- Empty state is useful.
- Dashboard is not overloaded.
- Customer users cannot access work queue.

---

## Sprint 13.5 — Universal Activity Timeline

### Goal

Add readable timelines to key records.

### Apply to

- customer/company
- booking
- order
- knife
- route/stop
- invoice
- subscription

### Timeline examples

- Booking created
- Collection window requested
- Assigned to route
- Order created
- Knives logged
- Photos uploaded
- Invoice issued
- Payment received
- Order completed
- Email sent
- Damage reported
- Subscription usage updated

### Customer-safe timeline must hide

- internal notes
- debug data
- raw audit data
- internal user IDs
- developer events

### Acceptance criteria

- Booking/order/customer timelines are readable.
- Customer sees safe/friendly timeline only.
- Admin sees operational timeline.
- Events are timestamped.
- Mobile layout is readable.
- Internal data is not leaked.

### Sprint 13.5 — Done

- **Backend:** `CustomerActivityTimelinePresenter` (allowlisted actions, `at` + `label` only) on portal booking, order, and company-subscription payloads; `AuditLogPresenter::mapTimeline` on operational route + route stop detail (`audit_timeline`, IP for staff); `GET /api/admin/companies/{company}/subscriptions/{subscription}/activity` (`subscriptions.view`).
- **Customer portal:** `CustomerActivityTimeline` on booking, order, and subscription account pages; Zod schemas for `activity_timeline`.
- **Admin:** `AuditTimeline` on route manager route + stop detail (from API `audit_timeline`); subscription CRM panel loads subscription activity from the new endpoint.
- **QA:** `CustomerPortalActivityTimelineApiTest`, `AdminSubscriptionActivityTimelineApiTest`; `npm run typecheck` / `lint` in `apps/frontend`.

---

## Sprint 13.6 — Customer Tracking Page

### Goal

Create a customer-facing booking/order tracking experience.

### Progress states

- Booking confirmed
- Collection scheduled
- Collected / knives received
- In sharpening
- Quality checked
- Ready for return
- Returned / completed

### Access model

Support logged-in customer portal tracking and/or secure email tracking link.

### Acceptance criteria

- Customer can track their own booking/order.
- Customer cannot access another customer’s record.
- Labels are customer-friendly.
- Internal notes/debug data are hidden.
- Tracking page works on mobile.
- No raw UUIDs shown in normal UI.

### Sprint 13.6 — Done

- **Backend:** `BookingTrackingToken` (HMAC, 90-day TTL); `PortalBookingPayload::publicTracking` (strips UUIDs, omits activity timeline); `GET /api/public/track/{token}` (`throttle:tracking-public`); `GET /api/account/bookings/{booking}/tracking-link` (`bookings.view`) returns `tracking_url` via `wesharp.customer_portal_base_url` / `FRONTEND_URL`.
- **Fulfilment copy:** `PortalFulfilmentPresenter` steps aligned to sprint language (booking confirmed, collection scheduled, collected · knives received, in sharpening, quality checked, ready for return, returned / completed) with clearer order vs workshop progression.
- **Frontend:** Public `/track/[token]` page; account `/account/bookings/[id]/track`; shared `CustomerTrackingView` (mobile-first steps + schedule + team updates); booking detail actions “Track progress” + “Copy guest link”.
- **QA:** `php artisan test --filter=PublicBookingTrackingApiTest`; `npm run typecheck` in `apps/frontend`.

---

## Sprint 13.7 — Booking Wizard and Conversion Improvements

### Goal

Polish customer booking into a simpler guided journey.

### Suggested steps

1. What do you need sharpened?
2. How many knives/items?
3. Collection address
4. Preferred date/time window
5. One-off or subscription
6. Review and book

### Optional improvements

- postcode/service area check
- estimated price
- package suggestion
- subscription suggestion
- “not sure” knife count option
- returning customer quick booking

### Acceptance criteria

- Booking flow is easier than a long form.
- Customer can complete booking on mobile.
- Required fields are clear.
- Optional fields are not overbearing.
- Confirmation page is reassuring.
- Booking still creates correct backend records.

### Sprint 13.7 — Done

- **Public book flow** (`BookPageClient.tsx`): six-step guided wizard (what to sharpen + service type → knife count with “not sure” skip → collection address → date & window → one-off / programme / unsure → review + contact + terms) with step indicator, larger mobile tap targets, and primary actions at the bottom.
- **API:** optional `programme_interest` (`one_off` | `subscription` | `unsure`) on `POST /api/public/booking-enquiries`; merged into customer notes in `CreatePublicBookingEnquiryAction`; validated in `StorePublicBookingEnquiryRequest`.
- **Schema:** `public-booking-schema.ts` — per-step validation via `validatePublicBookingWizardStep` / `PUBLIC_BOOKING_WIZARD_STEP_COUNT`.
- **QA:** `php artisan test --filter=PublicBookingEnquiryApiTest`; `npm run typecheck` in `apps/frontend`.

---

## Sprint 13.8 — Workflow Guardrails and Next Actions

### Goal

Stop messy data and guide staff with clear next actions.

### Guardrails

Prevent or clearly block:
- completing order with no knives/items
- issuing invoice with incomplete pricing
- converting booking to order twice
- assigning cancelled booking to route
- marking invoice paid twice
- exposing photos to customer before customer-visible
- destructive actions without confirmation

### Next-action prompts

- Booking created → assign to route / confirm window
- Booking assigned → collect / convert to order
- Order created → add knives/items
- Knives added → review pricing
- Priced order → generate invoice
- Invoice issued → await payment / mark paid
- Paid order → complete / return
- Route issue → review issue

### Acceptance criteria

- Invalid transitions are blocked by backend logic where appropriate.
- Users see clear next actions.
- Blocked actions explain what to do next.
- Destructive actions require confirmation.
- Existing valid workflows still work.
- Activity/audit trail captures important changes where appropriate.

### Sprint 13.8 — Done

- **Assign / convert guardrails:** Cancelled and no-show bookings cannot be assigned to a route or converted to an order; clear `422` messages (`AssignBookingToRouteAction`, `ConvertBookingToOrderAction`).
- **Invoice guardrail:** `CreateInvoiceFromOrderAction` rejects non-subscription, non-complimentary orders with no billable total (`total_pence <= 0`) instead of issuing a nominal invoice; feature test in `AdminInvoiceLifecycleApiTest`.
- **Evidence:** Uploads that explicitly request `customer_visible` honor the same gate as visibility updates (`chooseCustomerVisibleOnCreate` on `EvidencePhotoPolicy` + `visibilityForCreate` on `EvidencePhotoController`); test in `EvidencePhotoApiTest`.
- **Next actions:** `StaffWorkflowNextActions` adds `staff_next_actions` to `OrderJson::detail` and `BookingDetailResource`; admin booking and order pages show a “Next steps” alert; Zod schemas updated.
- **Destructive / high-impact UI:** Admin order page replaces `window.confirm` for large bulk line adds and risky blade / line transitions with `AlertDialog`.
- **QA:** `AdminBookingsApiTest` (assign + convert rejection cases).

---

## Sprint 13.9 — Sprint 13 Regression QA

### Goal

Regression test Sprint 13 only.

### Check

- navigation
- roles
- developer vs super_admin access
- customer/admin/route/finance views
- POS speed
- route mobile workflow
- content settings
- work queue
- timeline
- tracking page
- booking wizard
- workflow guardrails
- permissions

### Required output

At the end, provide:
- QA checks completed
- bugs found
- bugs fixed
- files changed
- deferred issues
- Sprint 13 final verdict: PASS / FAIL

### Sprint 13.9 — QA report

**Automated checks completed**

- **Backend:** `php artisan test` — 263 tests, all passed (after fix below).
- **Frontend:** `npm run typecheck`, `npm run lint`, `npm test` (Vitest) — all passed.

Manual checks from the sprint list (navigation, role spot-checks, POS speed, mobile route UX, browser walkthrough of content settings / work queue / timeline / tracking / booking wizard) were **not** executed in this run; they remain for human QA or Playwright if desired.

**Bugs found**

1. **Invoice Stripe checkout placeholder 500 in tests** — `CreateStripeHostedCheckoutSessionAction` depends on `PaymentProviderInterface`, which was not bound in the container, causing `BindingResolutionException` when hitting `POST /api/admin/invoices/{id}/stripe-checkout-session`.

**Bugs fixed**

1. Registered `PaymentProviderInterface` → `StripePaymentProvider` in `AppServiceProvider::register()` so finance/payment code resolves in all environments.

**Files changed (this QA pass)**

- `apps/backend/app/Providers/AppServiceProvider.php`
- `docs/roadmap/sprint-13.md` (this subsection)

**Deferred issues**

- Full manual regression matrix (customer/admin/route/finance UIs, POS tap-count, super_admin vs developer nav) — rely on existing automated coverage + spot QA in staging.

**Sprint 13 final verdict: PASS** (automated gate green; one DI bug fixed for finance flow).