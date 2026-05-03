# Sprint 17.1 — Service area data model audit

**Date:** 2026-05-01  
**Scope:** Read-only inspection of backend and frontend usage of **service areas** and related public flows. No product code changes in this phase.  
**Goal:** Confirm there is a single canonical model, document how coverage works today, list gaps vs Sprint **17.2+**, and recommend a **minimal target model** that extends the existing table rather than introducing a parallel system.

---

## 1. Executive summary

WeSharp already has **one canonical source of truth** for “are we in a service area?”: the `service_areas` table and `App\Models\ServiceArea`. Coverage for the public checker, waitlist guardrails, and pricing rule scoping all funnel through **UK postcode normalisation** and **longest matching `postcode_prefix`** among **active** rows.

There is **no** second competing “service area” entity. Operational routing uses separate concepts (for example route `coverage_city` / scheduled operational routes); those are **not** duplicated as a coverage model for marketing or booking eligibility in this audit’s scope.

**Gap vs roadmap:** there are **no** map coordinates, depot markers, or radius-based checks yet. Collection hints on the public check API are **global** (next scheduled operational route date), not per service area. Admin **CRUD** for `ServiceArea` rows is not exposed via dedicated “service area management” API routes in this pass (areas are created via seeders/factories and implied admin pricing flows); **17.2** should add explicit admin management with permissions.

**Target direction (17.2–17.4):** extend `service_areas` with **optional** geographic fields (centre point + radius) while **retaining** `postcode_prefix` for fallback, backwards compatibility, and pricing alignment. Centralise resolution in one resolver used by public check, waitlist, and pricing.

---

## 2. Current database model

**Table:** `service_areas` (migration `2026_04_29_118000_create_service_areas_table.php`).

| Column            | Role |
| ----------------- | ---- |
| `name`            | Display / seed label |
| `city`            | Returned in public API and workspace payloads |
| `region`          | Preferred **public label** when non-empty (see §4) |
| `country`         | Country code (e.g. GB) |
| `postcode_prefix` | Coverage key: prefix match after normalisation |
| `active`          | Inactive rows ignored by matcher and pricing area lookup |

**Not present:** latitude, longitude, radius, polygons, or external map provider identifiers.

---

## 3. How coverage is resolved today

**Implementation:** `App\Support\ServiceAreas\ServiceAreaPostcodeMatcher`.

1. **Normalise** input: trim, strip whitespace, uppercase (`M1 1AA` → `M11AA`).
2. Load all **active** service areas with a non-empty `postcode_prefix`.
3. Choose the single area whose prefix is a **prefix** of the normalised postcode with the **longest** prefix length (deterministic override for overlapping rules).

Empty postcodes do not match. Inactive areas do not participate.

**Pricing alignment:** `App\Services\Pricing\PricingRuleResolver` ties rules to a `service_area_id` and reuses the same prefix logic against the company’s default location postcode (or anonymous postcode for estimates). That keeps **pricing geography** and **public coverage** consistent as long as they share the same `ServiceArea` rows.

---

## 4. Public API (already implemented)

| Endpoint | Purpose |
| -------- | ------- |
| `POST /api/public/service-area/check` | Postcode → `covered`, optional `area`, optional `next_collection_date` |
| `POST /api/public/service-area/waitlist` | Sign up when **not** covered; rejects with `in_service_area` if postcode matches an active area |

**Throttle:** middleware `throttle:service-area-public` (see `ServiceAreaPublicApiTest` for behaviour).

**Check response shape** (`PublicServiceAreaCheckController`):

- `covered`: boolean — whether `resolveActiveArea` found a row.
- `area` (if covered): `id`, `city`, `label` — `label` is `region` if set, else `name`.
- `next_collection_date`: ISO date **only when covered**; sourced from `NextScheduledCollectionDay`, which is the **earliest future** `OperationalRoute.scheduled_date` that is not completed or cancelled — **not** filtered by service area or postcode.

**Implication for 17.3/17.4:** any promise like “next collection **in your area**” would require new data or routing rules; today the API only exposes a **fleet-wide** next scheduled day.

---

## 5. Waitlist (already implemented)

**Model:** `ServiceAreaWaitlistSignup` — stores name, email, postcode, normalised postcode, customer metadata, audit via `public.service_area_waitlist_signup`.

**Admin:** `GET /api/admin/service-area-waitlist` (permission `companies.view`) lists signups.

Waitlist **correctly** refuses signups when the postcode resolves to an active service area — same matcher as the checker.

---

## 6. Frontend (marketing vs API truth)

**Static config:** `apps/frontend/src/config/service-areas.ts` — small list of markets for **copy** (`SERVICE_AREAS`). Comment states pricing/geo rules are backend-side.

**Checker UI:** consumes the public check API (see `ServiceAreaCheckerSection` / `public-service-area-schema` in the app). The **authoritative** covered/not-covered result is always the API.

**Risk:** marketing slugs (`manchester`, `liverpool`) in the static file can drift from DB `ServiceArea` ids (UUIDs). Prefer showing labels from API responses for checker results; keep static list only where needed for prose.

---

## 7. Related but distinct concepts

| Concept | Relationship to `service_areas` |
| ------- | -------------------------------- |
| `OperationalRoute` + `NextScheduledCollectionDay` | Drives **global** next collection hint; not area-scoped. |
| Route / stop “coverage city” fields | Operational planning; do not replace postcode-prefix coverage. |
| `WorkspacePayload::serviceAreas()` | Exposes active areas (`id`, `name`, `city`) for workspace UX — still the same model. |

---

## 8. Gaps vs Sprint 17 roadmap

| Roadmap theme | Today | Gap |
| ------------- | ----- | --- |
| **17.2** Map + radius UI | None | No lat/lng/radius; no admin map page. |
| **17.3** Coverage API | Check endpoint exists | Only prefix-based; no address/geocode path; no combined radius + prefix policy documented in code. |
| **17.4** Public checker UX | Component + API | May need copy/CTA polish; prefilled booking handoff is product follow-up. |
| **17.5** Booking integration | Partially via API | Ensure wizard and account flows use same resolver as public check. |
| **17.6** Waitlist | Implemented | May need alignment if we add non-postcode coverage rules. |
| Collection hints | `next_collection_date` when covered | Not per-area; document or enhance later. |
| Multiple zones | Multiple `ServiceArea` rows + longest prefix | No polygon/multi-region geometry; prefix list can approximate “zones” at admin discretion. |

---

## 9. Recommended target model (for 17.2+ implementation)

**Principle:** **Do not** introduce a second service-area table or parallel “coverage zone” entity. **Extend** `service_areas` and evolve **one** resolver.

**Suggested columns (nullable for migration safety):**

- `centre_latitude`, `centre_longitude` (decimal) — map marker / depot / zone centre  
- `radius_metres` (unsigned int) — if null, **no** radius rule (prefix-only for that row)  
- Optional: `coverage_mode` enum later (`prefix_only` / `radius_only` / `prefix_or_radius`) if product needs explicit UX; otherwise document precedence: e.g. **if** radius configured and postcode geocodes successfully, use distance; **else** use longest-prefix among active rows.

**Resolver contract:** one internal function used by:

- `PublicServiceAreaCheckController`
- `PublicServiceAreaWaitlistController` (reject if covered)
- `PricingRuleResolver` (or a shared helper it calls)

**Postcode prefix:** keep as **fallback** and for **backward compatibility** with existing data and admin mental model; **17.2** can show “prefix fallback” in the UI as specified in the sprint brief.

**Geocoding:** when adding radius checks, use server-side geocoding with keys in env; never ship private keys to the browser.

---

## 10. References (code)

| Area | Location |
| ---- | -------- |
| Model | `apps/backend/app/Models/ServiceArea.php` |
| Matcher | `apps/backend/app/Support/ServiceAreas/ServiceAreaPostcodeMatcher.php` |
| Next collection hint | `apps/backend/app/Support/ServiceAreas/NextScheduledCollectionDay.php` |
| Public check | `apps/backend/app/Http/Controllers/Public/PublicServiceAreaCheckController.php` |
| Public waitlist | `apps/backend/app/Http/Controllers/Public/PublicServiceAreaWaitlistController.php` |
| Pricing | `apps/backend/app/Services/Pricing/PricingRuleResolver.php` |
| Routes | `apps/backend/routes/api.php` (`public/service-area/*`, admin waitlist index) |
| Tests | `apps/backend/tests/Feature/ServiceAreaPublicApiTest.php` |
| Frontend static list | `apps/frontend/src/config/service-areas.ts` |

---

## 11. Acceptance checklist (17.1)

- [x] Existing service area implementation is understood.  
- [x] Gaps are documented.  
- [x] A simple target model is chosen (extend `service_areas`, single resolver, prefix fallback).  
- [x] No duplicate service-area system: confirmed — one `ServiceArea` model drives checker, waitlist, pricing, and workspace list.
