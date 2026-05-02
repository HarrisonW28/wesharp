# Sprint 12.1 — Full system audit (WeSharp)

**Date:** 2026-05-01  
**Scope:** Code, docs and automated checks — not a full manual device/browser pass.  
**Method:** Architecture/product doc review (`docs/product/*`, `docs/security/*`, `docs/operations/*`), grep/static navigation checks, Clerk middleware source review, API route inventory, PHPUnit + frontend build.

---

## 1. Audit summary

WeSharp is a **coherent Laravel 13 + Next.js 15** monolith: tenant portal (`/account`), staff console (`/admin`), route-manager mobile segment (`/admin/routes…`), public marketing (`(public)`), Clerk JWT → Laravel RBAC, Stripe + Clerk webhooks with idempotency patterns in tests. **No separate “POS terminal” application** exists; **POS** in the audit checklist maps to **admin order / knife / payment / finance** workflows (workshop counter semantics).

**Automated health:** `php artisan test` (241 tests) **pass**; `npm run typecheck`, `npm run lint`, `npm run test` (Vitest), `npm run build` **pass**.

**One production-grade bug was fixed during this audit** (see §Broken workflows): Clerk middleware used `void auth.protect()` and an inverted “block everything except five URLs” pattern — Clerk awaits the **return value** of the user handler; omitting `await` allowed signed-out requests to fall through as `NextResponse.next()`. Middleware now **allowlists public marketing** implicitly by **only protecting** `/admin`, `/account`, `/auth`, `/venue-pending`, and `/offline`, and uses **`await auth.protect()`** (see `apps/frontend/src/middleware.ts`).

---

## 2. Broken workflows (pre-fix state)

| Workflow | Symptom (theoretical) | Severity | Status |
| --- | --- | --- | --- |
| **Clerk middleware** | Signed-out users could receive `NextResponse.next()` on `/admin` and `/account` because `auth.protect()` was not awaited/returned — server shell might load before client redirect. | **P0** (security / trust) | **Fixed** in 12.1 (`middleware.ts`) |
| **Public marketing allowlist** | Prior list only included `/`, login, register, unauthorised, forbidden — **if** `protect()` had worked, `/book` and brochure pages would have required sign-in. | **P0** (would block conversion) | **Addressed** by switching to explicit **protected** prefixes only |

*Local `curl` against `next dev` may still return `200` for `/admin` in **keyless/dev** Clerk modes — verify redirects in **staging with real Clerk keys**.*

---

## 3. Bugs / gaps by severity

### P0 — blocks production / security / core promise

| ID | Finding |
| --- | --- |
| P0-1 | **Clerk middleware** — `void auth.protect()`; fixed: `async` handler + `await auth.protect()` + protect only known app segments. |

### P1 — major workflow / ops risk

| ID | Finding |
| --- | --- |
| P1-1 | **`docs/product/mvp-scope.md`** was stale vs repo — **updated in 12.1** (admin surface, `/subscriptions` + `/services` public, Clerk webhook + inbox API). Other docs may still lag; periodic review. |
| P1-2 | **Webhook inbox** — ~~`GET /api/admin/webhooks/inbox` exists; **no admin UI**~~ **Fixed in Sprint 12.2:** `/admin/webhooks/inbox`. |

### P2 — confusing UX / incomplete polish

| ID | Finding |
| --- | --- |
| P2-1 | **Outbound invoice email / PDF / pay links** — documented backlog in `mvp-scope.md` (“Send invoice” placeholder). |
| P2-2 | **Public contact** — `/contact` is mailto/CTA pattern; no ticket API (documented). |
| P2-3 | **E2E** — Playwright critical Clerk path **skipped by default**; relies on PHPUnit for API truth. |
| P2-4 | **Dual `(admin)` / `(route-manager)` layouts** under `/admin` — intentional pass-through in route-manager; **fragile** if a third group adds another `admin/layout.tsx`. |

### P3 — polish / tech debt

| ID | Finding |
| --- | --- |
| P3-1 | **Pricing engine** — rules stored; customer catalogue evaluator not product-complete per `mvp-scope.md`. |
| P3-2 | **Offline PWA** — `/offline` + manifest; full SW caching not implemented. |
| P3-3 | **`next lint` deprecation** — Next 16 migration noise only. |

---

## 4. Production blockers

1. ~~**Middleware**~~ — addressed in code (verify in staging with production-like Clerk).
2. **Secrets & env** — ensure staging/prod use `docs/operations/gitlab-environments-and-deployment.md`; no live keys in git (spot-check **clean**).
3. **Manual UAT** — booking → route → order → invoice → payment journey on **real** Clerk + DB before go-live (see `docs/testing/qa-checklist.md`).

---

## 5. Duplicate / dead code (light review)

- **Route groups** `(admin)` vs `(route-manager)` share URL space — not duplicate pages, but **two `admin/layout.tsx`** files; only one wraps `AdminShell` (see `docs/product/mvp-scope.md` route manager note). No action required beyond awareness.
- No large **orphan** PHP controllers found in this pass; PHPUnit coverage exercises main admin/account flows.

---

## 6. Risky permissions (review)

- **`docs/security/permissions-matrix.md`** remains accurate: Finance vs route-manager separation (`StaffPermissionSeparationTest`), tenant `company_id` scoping, driver carve-outs on routes (`OperationalRoutePolicy`).
- **`payments.override`** limited to `super_admin` / `admin` — intentional; document when training finance users.

---

## 7. UX / mobile polish backlog (non-blocking)

- Pill sizing / one-line badges (Sprint 11 QA note) — **not re-validated** in this audit; keep for 12.4.
- Raw UUID exposure — policies say avoid; **spot-check** high-traffic admin tables in manual pass.
- Mobile route/photo capture — device-dependent; **manual** on real phones.

---

## 8. Recommended fix order (for Sprint 12.2+)

1. **Staging verify** Clerk middleware redirects on `/admin` & `/account` with production keys.
2. ~~**Refresh `mvp-scope.md`**~~ — aligned in 12.1 (see `docs/product/mvp-scope.md`); keep other docs in sync over time.
3. **Admin UI** for webhook inbox (or link + copy from audit/logs doc).
4. **Invoice email / PDF** (product decision — P2 backlog).
5. **Playwright** Clerk fixtures when stable.
6. **12.4** polish items.

---

## 9. Files changed in Sprint 12.1 (implementation)

| File | Change |
| --- | --- |
| `apps/frontend/src/middleware.ts` | **P0 fix** — `await auth.protect()`; protect only `/admin`, `/account`, `/auth`, `/venue-pending`, `/offline`. |
| `docs/roadmap/sprint-12.1-audit.md` | This audit deliverable. |
| `docs/roadmap/sprint-12.md` | § Sprint 12.1 — Done summary. |
| `docs/security/auth-sso.md` | Document actual middleware behaviour (protected prefixes, `await protect()`). |
