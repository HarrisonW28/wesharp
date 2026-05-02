# WeSharp Sprint 15 — Admin Navigation, Areas and Role-Aware UX

## Context

The admin platform has grown into CRM, routes, orders, finance, users, audit, content and settings.

Sprint 15 improves information architecture and role-aware navigation.

Do not rebuild routing or create a full nested menu system unless required.

## Sprint 15 principles

- Keep navigation intuitive.
- Do not remove access to existing pages.
- Avoid dead links.
- Make areas obvious to non-technical users.
- Route manager/mobile users should see fewer distractions.
- Developer-only tools should not be shown to normal admins unless required.
- Backend permissions must still enforce access.

---

## Sprint 15.1 — Admin Navigation Areas

### Goal

Reorganise admin navigation into clearer operational areas.

### Suggested areas

- Command Centre
- CRM
- Operations
- Routes
- Finance
- Customers
- Growth
- System

### Requirements

- Use existing routes where possible.
- Keep sidebar readable.
- Do not add links to pages that do not exist.
- If nested nav is not supported, use clear flat labels.

### Example flat labels

- CRM — Companies
- Operations — Bookings
- Operations — Orders
- Routes — Collections
- Routes — Today
- Finance — Invoices
- Finance — Payments
- System — Audit Log

### Acceptance criteria

- Admin nav feels grouped by area.
- Existing pages remain accessible.
- No broken links.
- Mobile drawer still works.
- Route manager nav remains simple.

---

## Sprint 15.2 — Sidebar Role Visibility

### Goal

Hide irrelevant links based on role/permission.

### Roles to consider

- developer
- super_admin
- admin
- finance
- route_manager
- driver
- sales
- customer_staff

### Requirements

- Frontend nav items may define required permissions.
- Missing permission metadata should not break nav.
- Backend remains source of truth.
- Do not rely only on hidden links for security.

### Acceptance criteria

- Developer/system links only show to developer where appropriate.
- Finance links show to finance/admin/super_admin/developer.
- Route links show to route users/admins.
- Customer portal users do not see admin nav.
- URL guessing is still blocked by backend permissions.

---

## Sprint 15.3 — Developer Role Separation

### Goal

Separate developer/system access from business super admin access.

### Developer-only examples

- audit internals
- webhooks
- system diagnostics
- raw technical settings
- integration logs
- destructive debug tools

### Requirements

- Add or confirm developer role support.
- Do not accidentally demote existing admin users.
- Do not lock out current super admin/developer user.
- Add permission checks where needed.

### Acceptance criteria

- Developer can access system tools.
- Business admin can run the business without dev tools.
- Normal admin cannot access developer-only pages.
- Tests cover at least audit/webhook/system access.

---

## Sprint 15.4 — Navigation Copy Cleanup

### Goal

Rename confusing nav items.

### Examples

- Routes → Collection Routes
- Today → Today’s Route
- Subscriptions → Active Subscriptions
- Subscription Plans → Pricing Plans
- Audit → Audit Log
- CRM → Companies / CRM

### Acceptance criteria

- Labels are clear to non-technical users.
- Labels fit mobile.
- No route path changes unless required.
- Existing tests pass.

---

## Sprint 15.5 — Subscription Plan Admin Display Controls

### Goal

Allow admins to control how subscription plans appear publicly.

### Fields

- public name
- public description
- highlight bullets
- public visibility
- recommended flag
- CTA label
- display order

### Requirements

- Public frontend must use backend values.
- Inactive/private plans should be hidden publicly.
- Custom/bespoke card should still appear separately.
- Do not duplicate pricing logic in frontend.

### Acceptance criteria

- Admin can control public plan display.
- Public frontend uses backend values.
- Inactive/private plans are hidden.
- Custom/bespoke card still appears separately.
- Mobile subscription cards display correctly.

---

## Sprint 15.6 — Sprint 15 Regression QA

### Check

- admin sidebar desktop
- mobile drawer
- role visibility
- developer links
- route manager links
- finance links
- subscription plan admin display controls
- customer portal unaffected
- backend permission enforcement
- no broken nav links

### Required output

At the end, provide:
- QA checks completed
- bugs found
- bugs fixed
- files changed
- deferred issues
- Sprint 15 final verdict: PASS / FAIL