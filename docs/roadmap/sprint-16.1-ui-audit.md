# Sprint 16.1 — UI/UX and layout audit

**Date:** 2026-05-01  
**Scope:** Read-only inspection of `apps/frontend` (layouts, shells, representative pages). No UI code changes in this phase.  
**Goal:** Focused list of layout, responsiveness and UX issues to feed **Sprint 16.2+**; no rebuild.

---

## 1. Executive summary

The app uses **four distinct chrome patterns** (public, account, admin, route-manager). Shared primitives exist (`PageHeader`, `Breadcrumbs`, shadcn `Card`/`Button`, etc.) but **page-level composition is inconsistent**: some areas use `PageHeader` + `Breadcrumbs`, others use custom titles only; route-manager uses a **separate** `RouteManagerShell` header model. **Breadcrumbs** default `homeHref` to `/admin/dashboard`, which is wrong for customer site content unless overridden — several call sites pass custom crumbs but risk inconsistency. **POS mode** called out in the roadmap was **not found as a named route or shell** in the frontend during this pass; fast retail flows may live under general admin order/workshop UIs — **confirm product mapping** before 16.3.

---

## 2. Public website

| Item | Severity | Notes |
| --- | --- | --- |
| Marketing chrome | Low | `PublicShell`: sticky header, sheet menu on small screens, reasonable tap targets on mobile links (`min-h-10` patterns in sheet). |
| Nav density | Medium | Desktop nav hidden until `lg`; between `md` and `lg` primary nav is sheet-only — acceptable but “tablet” marketing nav is hamburger-only. |
| Booking wizard | Medium–High | `BookPageClient` is a large multi-step client component (~800+ lines): harder to maintain; risk of uneven spacing/step regressions. Worth **decomposition** in 16.2+, not rewrite. |
| Loading / error / success | Medium | Wizard has status state (`idle` / `submitting` / `success` / `error`); verify parity on other public flows (pricing calculator, service area checker). |

---

## 3. Customer portal (`AccountShell`)

| Item | Severity | Notes |
| --- | --- | --- |
| Shell parity vs admin | Low | Same structural pattern as admin: sidebar (`md+`), `TopBar`, `main` with `space-y-8 px-4 py-6 md:px-8`. Footer tagline **absent** vs admin’s coverage blurb — intentional but contributes to “different product” feel. |
| `min-h-screen` vs admin `min-h-svh` | Low | Account uses `min-h-screen`; admin uses `min-h-svh` — minor mobile viewport inconsistency (address in 16.2 layout tokens). |
| Breadcrumbs | Medium | Many account pages use `PageHeader` + breadcrumbs; ensure all deep links (e.g. booking detail, order detail) share the same back-path affordance (16.5). |

---

## 4. Admin dashboard & sidebar

| Item | Severity | Notes |
| --- | --- | --- |
| `AdminShell` | Low | Clear split: sticky sidebar, `TopBar` with search, mobile drawer. Gradient background differentiates from account. |
| Route manager in same shell | Medium | `route_manager` swaps `ROUTE_MANAGER_NAV_SECTIONS` inside `AdminShell` — good. Users switching between “full admin” and “driver” roles still see **different** chrome when they hit `/admin/routes/today` (see route/agent section below) — potential confusion (“two apps”). |
| Tables / density | Medium | List pages (bookings, orders, invoices) not exhaustively audited cell-by-cell; likely **horizontal scroll** on small tables — flag for **16.3 / 16.4** (card fallback or sticky first column). |

---

## 5. Booking flow (public)

| Item | Severity | Notes |
| --- | --- | --- |
| Step UX | Medium | Six steps + review; primary CTA placement and back navigation rely on local patterns — verify thumb reach on small phones (sticky footer for primary action?). |
| Progress indicator | Low | Step index and headings present; compare clarity with account `bookings/new` if applicable. |

**Account booking creation:** `account/bookings/new` — separate flow from public wizard; **cross-check** copy, spacing, and error banners for consistency (16.2).

---

## 6. Order flow

| Item | Severity | Notes |
| --- | --- | --- |
| Admin order detail | Medium | `admin/orders/[orderId]` uses `PageHeader`-style patterns with heavy action sets — risk of **wrapped actions** crowding on narrow widths. |
| Customer order detail | Medium | Mirror layout/spacing with admin where concepts align (status, money lines). |

---

## 7. Knife pages

| Item | Severity | Notes |
| --- | --- | --- |
| Admin knife detail | Medium | High action count (`POST` workflows); touch targets and grouping need review on tablet (16.3). |
| Customer knife views | Low | Align empty states with account shell spacing. |

---

## 8. Pricing / subscription surfaces

| Item | Severity | Notes |
| --- | --- | --- |
| Public pricing | Low | Uses marketing layout + `PublicPricingCalculator` — watch overflow on narrow cards. |
| Admin subscription plans | Medium | Form-heavy admin page; compare field widths with `content-settings` sections (16.2 form width tokens). |
| Tenant subscription | Low | Account subscription page should match invoice money formatting rules (GBP). |

---

## 9. POS mode

| Item | Severity | Notes |
| --- | --- | --- |
| Definition gap | **High (process)** | No dedicated `pos` or `POS` route/component name found. **Action:** map “POS” in roadmap to concrete URLs (e.g. workshop bulk, in-store order) and re-audit in **16.3** once identified. |

---

## 10. Route / agent pages

| Item | Severity | Notes |
| --- | --- | --- |
| `RouteManagerShell` | Medium | Deliberate **mobile-first** narrow column (`max-w-md`) with dark header on small screens; desktop expands — strong pattern but **visually distinct** from `AdminShell` (by design — note for onboarding/docs). |
| Today page | Low | Uses sticky footer CTA pattern + bottom nav — good for touch; verify safe-area with iOS notches if PWA (16.3). |
| Stop detail | Medium | Evidence + portal sections: long scroll; confirm primary actions remain reachable (sticky footer pattern reuse). |

---

## 11. Reports / dashboards

| Item | Severity | Notes |
| --- | --- | --- |
| Analytics / reports | Medium | Multiple report pages under `admin/reports/*`; likely share similar table/chart layout — candidate for **shared report layout wrapper** (16.2). |
| Work queue | Medium | Operational density; mobile usability flagged for **16.3**. |

---

## 12. Settings pages

| Item | Severity | Notes |
| --- | --- | --- |
| Site content hub | Low | Uses `_section-shell` + `PageHeader` + save/reset actions — relatively consistent. |
| Account settings | Medium | Compare with admin “settings” affordances (breadcrumbs, section cards). |

---

## 13. Mobile / tablet breakpoints

| Item | Severity | Notes |
| --- | --- | --- |
| Shell breakpoints | Medium | Public: `lg` for full nav; Account/Admin: `md` for sidebar — **inconsistent breakpoint** across segments; document a single standard in 16.2. |
| Horizontal overflow | Medium | Route manager sets `overflow-x-hidden`; admin main does not — audit tables and flex rows that might spill (orders, CRM). |
| Typography | Low | `PageHeader` description uses `text-base` on small, `md:text-sm` — can feel small on desktop descriptions; validate against “avoid tiny text” principle. |

---

## 14. Empty / loading / error states

| Item | Severity | Notes |
| --- | --- | --- |
| Patterns | Medium | Mix of inline spinners, `Loader2`, toast errors — no single **empty state** component observed as mandatory everywhere; 16.2 should standardise. |
| Next.js `error.tsx` / `loading.tsx` | Low | Route-manager today has `loading.tsx` / `error.tsx`; coverage unknown for all segments — spot-check in **16.7** QA. |

---

## 15. Forms, tables, CTAs

| Item | Severity | Notes |
| --- | --- | --- |
| Primary vs secondary | Medium | `PageHeader` stacks actions full-width on mobile — good; verify destructive actions always secondary visually (invoices, user suspend, content reset). |
| Duplicate headers | Low | Prior fix noted in route-manager layout comment (duplicate gates) — watch for **nested titles** if wrappers multiply. |
| Raw UUIDs | Medium | Roadmap rule: avoid raw UUIDs in normal UI — spot-check CRM deep links, lookups still showing IDs in edge cases (16.4). |

---

## 16. Overlapping / duplicated components (candidates to consolidate)

| Area | Examples / notes |
| --- | --- |
| Layout headers | `PageHeader` vs `RouteManagerShell` title block vs ad-hoc `<h1>` — unify semantics in 16.2. |
| Breadcrumbs | `Breadcrumbs` supports both `items` and `crumbs`; `homeHref` differs by segment — consider thin wrappers: `AdminBreadcrumbs`, `AccountBreadcrumbs`. |
| Shell chrome | `AdminShell` and `AccountShell` share ~70% structure — optional shared `StaffShell` / `PortalShell` base in 16.2 (careful with role regressions). |
| Toaster placement | Admin: `top-right`; route-manager root layout: `top-center` — minor inconsistency. |

---

## 17. Responsive issues by surface (short list)

| Area | Issue |
| --- | --- |
| Public | Tablet-only hamburger; long forms may need shorter line-length (`max-w` on prose). |
| Account | Same as admin for wide tables on small laptops. |
| Admin | Dense list pages; sidebar hidden `< md` — drawer-only navigation. |
| Route manager | Narrow column on phone good; desktop `md+` switches theme — verify no jarring jumps. |
| Auth | Not deeply audited — sign-in/sign-up Clerk pages: include in **16.3** pass. |

---

## 18. Deferred (16.2+)

- Layout system tokens, shared page scaffold, form/table standards.
- Mobile overflow sweeps and touch target audit.
- POS surface mapping and dedicated audit.
- Auth layout pass.
- Automated visual regression (optional, not in sprint text).

---

## 19. Acceptance check (Sprint 16.1)

- [x] Audit document exists (this file).
- [x] Major UI/UX problems listed.
- [x] Duplicated / overlapping components identified.
- [x] Responsive issues listed by screen/segment.
- [x] No large rebuild performed in this phase.

**Verdict:** Sprint **16.1** — **complete** (documentation deliverable only).
