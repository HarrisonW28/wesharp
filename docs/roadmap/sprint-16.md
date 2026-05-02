# WeSharp Sprint 16 — UI/UX Cleanup, Layout System and Responsiveness

## Context

Manual QA shows the platform has grown quickly and now needs a proper UI/UX cleanup pass. Some pages overlap, some layouts do not fit well, and some views are not responsive enough.

This sprint is about making the existing platform feel consistent, spacious, usable and professional before adding more large product features.

## Existing functionality warning

Do not rebuild existing modules from scratch. Earlier sprints may already include:
- admin/customer portals
- navigation areas
- bookings
- orders
- knives
- pricing
- invoices
- subscriptions
- POS
- routes
- notifications
- reports
- PWA/mobile groundwork

For existing modules:
- audit what exists
- improve layout and usability
- remove overlap/confusion
- fix responsiveness
- standardise components
- document bigger issues as deferred

## Sprint principles

- Do not rewrite the whole app.
- Do not change backend behaviour unless needed to support UI fixes.
- Keep Laravel as source of truth for permissions.
- Customer UI should feel friendly and easy.
- Admin UI should feel efficient and operational.
- POS and route UI should be fast-entry and touch-friendly.
- Avoid tiny text, cramped spacing and hidden controls.
- Avoid duplicated headers, sidebars, footers or nested app shells.
- Avoid raw UUIDs in normal UI.

---

## 16.1 — UI/UX and Layout Audit

### Goal

Audit the existing frontend and create a focused list of layout, responsiveness and UX issues.

### Check

- public website
- customer portal
- admin dashboard
- admin sidebar/navigation
- booking flow
- order flow
- knife pages
- pricing/subscription pages
- POS mode
- route/agent pages
- reports/dashboard pages
- settings pages
- mobile breakpoints
- tablet breakpoints
- empty/loading/error states
- forms and tables
- buttons and CTAs

### Acceptance criteria

- Audit document exists (**`docs/roadmap/sprint-16.1-ui-audit.md`** — code inspection only, no rebuild).
- Major UI/UX problems are listed.
- Duplicated/overlapping components are identified.
- Responsive issues are listed by screen/page.
- No large rebuild is done in this phase.

---

## 16.2 — Layout System and Component Consistency

### Goal

Standardise the app layout system so pages feel consistent.

### Build/fix

- consistent page headers
- consistent page descriptions
- consistent primary/secondary actions
- consistent card spacing
- consistent form widths
- consistent table wrappers
- consistent empty states
- consistent loading states
- consistent error states
- consistent mobile spacing
- consistent dashboard widgets

### Rules

- Reuse existing components where possible.
- Avoid creating many one-off styles.
- Do not break role-based layouts.

### Acceptance criteria

- Core pages share a consistent layout pattern.
- Page actions are predictable.
- Components do not visually overlap.
- Layouts do not feel cramped.

### 16.2 — Implemented (2026-05-01)

Shared primitives in `apps/frontend/src/components/layout/`:

- **`PortalPage`** + **`PageActions`** — standard vertical gap (`gap-6 sm:gap-8`) and action row wrapping for admin/account pages.
- **`PortalFormWidth`** — `max-w-2xl` cap for form readability.
- **`PortalLoadingCenter`**, **`PortalErrorAlert`**, **`PortalEmptyCard`** — aligned loading / error / empty treatments.

Other adjustments:

- **`PageHeader`** — description uses `text-sm` → `sm:text-base` so body text does not shrink on desktop.
- **`AdminShell`** / **`AccountShell`** — main padding `px-4 py-6 sm:px-6 md:px-8`; account root **`min-h-svh`** (match admin).
- **`DataTable`** — `shadow-sm` on scroll region for parity with cards.
- **Wired on:** admin dashboard, analytics, work queue; account dashboard, account settings (illustrates `PortalFormWidth` + states).

Remaining portal pages can adopt the same wrappers incrementally (no change to route-manager shell in this slice).

---

## 16.3 — Responsive and Mobile Layout Cleanup

### Goal

Fix mobile/tablet layout problems across customer, POS, route and admin areas.

### Focus

- customer booking wizard
- customer dashboard
- customer tracking
- POS mode
- route/agent Today page
- route stop detail
- photo capture
- admin work queue
- admin forms/tables
- navigation menu
- sign-in/sign-up pages

### Requirements

- larger tap targets
- no horizontal overflow
- readable text sizes
- sensible stacking order
- sticky/accessible actions where useful
- no hover-only actions
- safe area spacing on mobile
- forms fit small screens
- tables degrade to cards or scroll safely

### Acceptance criteria

- Key workflows are usable on mobile.
- POS and route flows are touch-friendly.
- Admin remains usable on tablet/mobile.
- No obvious horizontal overflow.

### 16.3 — Implemented (2026-05-01)

Touch and small-screen polish without changing shells’ role split:

- **Shells:** `AdminShell` / `AccountShell` `<main>` — `min-w-0 overflow-x-hidden` so wide tables/widgets don’t scroll the viewport sideways. **`PublicShell`** — main content column `min-w-0 overflow-x-hidden`; mobile nav links and menu trigger use larger hit areas + `touch-manipulation`.
- **Auth:** **`(auth)/layout`** — `min-h-dvh` + bottom safe-area padding for Clerk sign-in/up on notched devices.
- **Booking wizard (`BookPageClient`):** outer `overflow-x-hidden` + bottom safe-area padding; **sticky** Back/Continue/Cancel row on small viewports with frosted bar + safe bottom inset; programme cards **min-height** + `touch-manipulation`; terms checkbox **larger**; success CTA touch-friendly.
- **Tracking:** **`CustomerTrackingView`** — `min-w-0` + **break-words** on timeline and blockquotes; **`ButtonLink`** taller + `touch-manipulation`. **Account track** / **public track** pages — `overflow-x-hidden`, safer padding, larger error/CTA buttons.
- **Route manager:** **`RouteManagerShell`** — header respects **safe-area-inset-top**; field-mode strip uses **safe-area-inset-bottom**. **`MobileBottomNav`** — `text-xs`, larger icons and **min row height** (~52px). **`TopBar`** menu — 44×44-style target on mobile.
- **Evidence:** **`RouteStopEvidenceSection`** — upload + visibility/archive controls scaled for touch on small screens.
- **Tables:** **`DataTable`** — outer + `ScrollArea` **`max-w-full min-w-0`** so horizontal scroll stays inside the component.

---

## 16.4 — Forms, Tables and Data Display Polish

### Goal

Make dense backend-driven pages easier to use.

### Improve

- form labels/helper text
- required/optional field clarity
- validation messages
- searchable selects
- UUID-safe lookup fields
- table columns
- status badges
- money formatting
- date formatting
- quick actions
- empty states
- pagination/filter clarity

### Acceptance criteria

- Forms are easier to complete.
- Lookup fields show readable labels, not confusing raw IDs.
- Tables are easier to scan.
- Prices display as GBP with decimals.
- Status badges are consistent.

### 16.4 — Implemented (2026-05-01)

Focused **admin data surfaces** (lists, lookups, booking detail) — no backend changes.

- **`lib/format/dates.ts`** — `formatDisplayDate` for `YYYY-MM-DD` / ISO strings (UK short date, no misleading TZ shifts for calendar dates).
- **`lib/format/pagination-caption.ts`** — `paginationRangeCaption` (“Showing a–b of n”) for list footers.
- **`lib/format/display-id.ts`** — `lookupClosedDisplayLabel` so async lookups never flash a bare UUID; shows **“Selected record”** until the label resolves.
- **`AsyncEntityLookup`** — closed state uses `lookupClosedDisplayLabel`.
- **`status-helpers`** — `orderPaymentStatusLabel` for workshop orders; **`paymentAttemptLabel`** gains **`partial`** and **`waived`** (aligned with **“Partially paid”** wording).
- **Admin orders** — payment column uses **`orderPaymentStatusLabel`**; filter hint + richer pagination line (page of total + range).
- **Admin bookings** — date column formatted; estimate column styling; create-dialog **required/optional** clarity; filter hint; pagination range caption.
- **Booking detail** — linked orders use **`orderStatusLabel`** + tabular totals; route stop line uses **`routeStopStatusLabel`**.
- **Admin invoices** — **Due** column uses **`formatDisplayDate`**; filter hint; pagination line matches orders/bookings pattern.

---

## 16.5 — Dashboard and Navigation Usability Polish

### Goal

Make dashboards and navigation easier to understand.

### Improve

- back to home/dashboard links
- breadcrumbs where useful
- active nav states
- grouped nav spacing
- mobile nav
- bottom route navigator
- dashboard cards
- work queue visibility
- quick actions
- role-aware nav clarity

### Acceptance criteria

- Users know where they are.
- Users can return home/dashboard easily.
- Admin/route/customer navigation feels distinct and suitable.
- No duplicate headers/footers.

### 16.5 — Implemented (2026-05-01)

- **`Breadcrumbs`** — first link label defaults by shell: **`Dashboard`** for `/admin…`, **`Overview`** for `/account…`, **`Home`** otherwise; optional `homeLabel` override.
- **`SidebarNav`** — `aria-current="page"` on active items; section headers **emphasise when a child is active**; slightly **looser vertical rhythm** between groups and items.
- **`AdminShell`** — **role-aware** mobile title: **“Route manager”** vs **“Operations console”**; **`MobileDrawer`** **`brandSuffix="Ops"`** + **quick links** (dashboard, work queue; route role adds **Today’s stops** first); aside footer copy shortened for role clarity.
- **`AccountShell`** — Top bar **“Customer portal”**; drawer **`brandSuffix="Account"`** + quick links (**Overview**, **Book a collection**, **WeSharp website**).
- **`RouteManagerShell`** — header **jump links** to **Operations dashboard** and **Work queue** (alongside existing bottom nav + exit control).
- **`AdminQuickActionsCard` / admin dashboard** — **Work queue** as first quick tile and **header action** with icon.
- **`WorkQueueAttentionCard`** — when there is load: **lane + task counts** badge and **stronger** card treatment for scanability.

---

## 16.6 — Visual Design Polish

### Goal

Make the platform look more premium without turning this into a full website redesign.

### Improve

- spacing
- typography scale
- card styling
- button hierarchy
- icons
- page backgrounds
- section separation
- status colours
- focus states
- error/warning/success styling

### Acceptance criteria

- Platform feels cleaner and more professional.
- Important actions stand out.
- Visual hierarchy is clearer.
- Accessibility is not worsened.

### 16.6 — Implemented (2026-05-01)

Token and primitive polish only (no page-by-page restyle):

- **`globals.css`** — slightly **clearer borders/inputs** in light mode; **`min-h-svh`** on `body`; **light-mode top gradient** wash for a calmer default canvas (shells unchanged).
- **`Button`** — **ring offset** on focus; **primary/destructive** carry a touch more **elevation**; outline/secondary use **hover border** cue.
- **`Card`** — **softer shadow + hairline ring** in light mode; dark mode **ring** instead of heavy shadow; **`CardTitle`** defaults to **`text-lg`**.
- **`Alert`** — **`success`** and **`warning`** variants; **default** and **destructive** use **tinted surfaces** and **rounded-xl**; icon alignment unchanged.
- **`Badge`** — **warning** uses **amber** (not primary); **focus-visible ring + offset** like buttons/inputs.
- **`Input` / `Textarea`** — **focus ring offset** for contrast on tinted portal backgrounds.
- **`PortalPage`** — section rhythm **`gap-7` / `gap-9`**.
- **`PageHeader`** — title **scales to `text-3xl` on `md+`**; slightly more **vertical air** around the block.

---

## 16.7 — UI/UX Regression QA

### Goal

Regression test Sprint 16 work only.

### Check

- desktop layouts
- tablet layouts
- mobile layouts
- customer portal
- admin portal
- POS
- route/agent pages
- booking flow
- forms
- tables
- nav/sidebar
- sign-in/sign-up
- permissions

### Required output

At the end, provide:
- QA checks completed
- bugs found
- bugs fixed
- files changed
- deferred UI issues
- Sprint 16 verdict: PASS / FAIL
