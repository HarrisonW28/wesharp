# Module map (WeSharp MVP — what exists now)

Functional areas vs implementation state in `**apps/backend**` as of this doc.

Legend: ✅ schema + models (+ seed stubs) ⏳ partial / scaffolding only 🔲 not started

---

## Tenant & CRM core


| Concern                     | State | Implementation                                                                     |
| --------------------------- | ----- | ---------------------------------------------------------------------------------- |
| Organisations (“companies”) | ✅     | `companies` + `Company`; soft deletes; status enum                                 |
| Sites / kitchens            | ✅     | `company_locations`                                                                |
| Contacts                    | ✅     | `contacts`                                                                         |
| Notes                       | ✅     | Polymorphic `notes`; author `users` FK                                             |
| Files                       | ✅     | Polymorphic `uploaded_files`                                                       |
| Audit trail                 | ✅     | Polymorphic `audit_logs`; `App\Support\AuditLogger` placeholder for richer logging |


**Also implemented:** Admin **CRM REST** under `**/api/admin/companies**` (internal staff + policies + form requests + audit on mutations). Browser UI: Next.js **`/admin/crm`** (+ profile route). See **`docs/product/admin-crm.md`**.

**Still not built:** marketing automation, CRM email templates, full account export.

---

## Operations (field + workshop)


| Concern                      | State | Implementation                                                          |
| ---------------------------- | ----- | ----------------------------------------------------------------------- |
| Collections / bookings       | ✅     | `bookings` (+ `BookingStatus`, `ServiceType`)                           |
| Driver routes (vehicle runs) | ✅     | `**routes`** table via `**OperationalRoute**`; `OperationalRouteStatus` |
| Route stops                  | ✅     | `route_stops` links optional `booking_id`; `RouteStopStatus`            |
| Knife tracking               | ✅     | `knives` + `knife_photos` + `knife_status`                              |
| Damage QA                    | ✅     | `damage_reports`                                                        |


**Deviation:** Laravel model name `**OperationalRoute`** (table still `**routes**`) to avoid clashing naming with Laravel `**Route**`.

**Also implemented:** Admin booking lifecycle API (**`/api/admin/bookings`** + audited actions); **route manager REST** (`**/api/admin/routes**`, **`/api/admin/route-stops`** + action classes — see **`docs/product/route-manager.md`**), migration **`2026_04_30_160000`** extra booking columns (windows, knife counts, `price_estimate_pence`, `assigned_route_id`). UI: **`/admin/bookings`** + **`/admin/routes/**`**.

**Not built yet:** ETA optimization, proofs of delivery APIs, websocket tracking.

---

## Commercial & finance


| Concern            | State | Implementation                                           |
| ------------------ | ----- | -------------------------------------------------------- |
| Commercial orders  | ✅     | `orders` + `order_items`                                 |
| Invoicing          | ✅     | `invoices` + `invoice_items`; `InvoiceStatus`            |
| Payments & refunds | ✅     | `payments` + `refunds`; `PaymentStatus`, `PaymentMethod` |


**Partially wired:** automated reconciliation jobs, VAT exports, PSP settlement reporting beyond webhook intake.

---

## Analytics dashboards

| Concern        | State | Implementation                                                                                                                                 |
| -------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Admin BI tiles | ✅     | **`AnalyticsService`**, **`GET /api/admin/analytics/overview|sales|routes|operations`**, guarded by **`permission:analytics.view`**              |
| Browser charts | ✅     | **`/admin/analytics`** (Recharts responsive containers — **docs/product/analytics-reporting.md**) |

---

## Settings & monetisation geography


| Concern       | State | Implementation                                             |
| ------------- | ----- | ---------------------------------------------------------- |
| Service areas | ✅     | `service_areas` (city-centric coverage)                    |
| Pricing rules | ✅     | `pricing_rules` with optional FK to area; JSON constraints |


**Not built yet:** Price engine evaluator, versioning, admin CMS for overrides.

---

## Platform / cross-cutting


| Concern           | State | Implementation                                                         |
| ----------------- | ----- | ---------------------------------------------------------------------- |
| HTTP API skeleton | ✅     | `routes/api.php` groups; `**GET /api/health`**; correlation middleware |
| JSON API helpers  | ✅     | `App\Support\ApiResponses`                                             |
| Auth users        | ✅     | Laravel `users` (seed demo operators/drivers)                          |
| Tenant REST       | ✅     | `GET/POST … /api/account/*` guarded by Clerk + **`tenant`** (`EnsureTenantCustomer`); SPA maps in **`docs/product/customer-portal.md`** |

**Operational:** **`POST /api/webhooks/stripe`** is registered in **`routes/api.php`** (signature-verified handling — see **`docs/security/stripe-security.md`**).

---

## Out of scope today (explicit)

Multi-region replication, GDPR export APIs, immutable audit archiving to cold storage beyond DB rows, BI warehouse sync.