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

---

## Sprint 13.4 — Admin Work Queue / Needs Attention

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