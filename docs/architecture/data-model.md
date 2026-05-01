# Data model (WeSharp MVP)

This document reflects the `**apps/backend` Laravel migration set** and Eloquent models as implemented. UUID primary keys are used for domain tables (`HasUuids`); `users.id` remains a bigint for Laravel conventions.

---

## 1. Tables (excluding Laravel framework internals)

Stock Laravel tables (migration prefix `0001_01_01_*`):


| Table                        | Purpose                                   |
| ---------------------------- | ----------------------------------------- |
| `users`                      | Authenticatable users (`id` bigint PK)    |
| `password_reset_tokens`      | Password resets                           |
| `sessions`                   | DB-backed sessions (see `SESSION_DRIVER`) |
| `cache` / `cache_locks`      | Cache store when using database cache     |
| `jobs`                       | Queue when using `database` driver        |
| `job_batches`, `failed_jobs` | Jobs metadata / failures                  |


WeSharp MVP tables (`2026_04_29_*` migrations):


| Table               | UUID PK | Notes                                                                                                                          |
| ------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `companies`         | Yes     | Tenant-style org; optional `slug`; `company_status`; soft deletes (`deleted_at`); nullable `city` indexed; optional **`stripe_customer_id`** |
| `company_locations` | Yes     | FK `company_id` → `companies` (cascade)                                                                                        |
| `contacts`          | Yes     | FK `company_id` (cascade)                                                                                                      |
| `notes`             | Yes     | Polymorphic `noteable_*` (`uuidMorphs`)                                                                                        |
| `uploaded_files`    | Yes     | Polymorphic `fileable_*`                                                                                                       |
| `audit_logs`        | Yes     | Optional `actor_id` → `users`; polymorphic `auditable_*`; JSON `payload`; `created_at` only (no row `updated_at`)              |
| `**routes**`        | Yes     | **Operational batches** (named `OperationalRoute` in code). Column `route_status` (enum string). FK `driver_user_id` → `users` |
| `bookings`          | Yes     | FKs `company_id`, `company_location_id` → `company_locations`; `scheduled_date`; `booking_status`, `service_type`              |
| `route_stops`       | Yes     | FK `route_id` → `**routes**`; nullable FK `booking_id` → `bookings`; `sequence`, timestamps                                    |
| `orders`            | Yes     | FK **`company_id`**, **`booking_id`** (cascade); nullable FK **`route_id`** → **`routes`**; **`order_status`**; monetary columns **`subtotal_pence`**, **`tax_pence`**, **`total_pence`**, **`discount_pence`**, **`price_per_knife_pence`**, **`knife_count`**; **`payment_status`** (`OrderPaymentStatus`); **`currency`** |
| `order_items`       | Yes     | FK `order_id` (cascade)                                                                                                        |
| `knives`            | Yes     | FK **`company_id`**; nullable **`booking_id`**, **`order_id`**; unique **`tag_id`**; **`knife_status`**; optional **`description`**, attribution FKs (**`sharpened_by_user_id`** …) |
| `knife_photos`      | Yes     | FK `knife_id`; nullable FK `uploaded_file_id`                                                                                  |
| `damage_reports`    | Yes     | FK `knife_id`, `company_id`, nullable `order_id`; optional `reported_by_id` → `users`                                          |
| `invoices`          | Yes     | FK `company_id`; nullable FK `order_id`; unique `invoice_number`; `issued_on`, `due_on`; **`source_type`**, **`source_id`**, **`billing_period_start`**, **`billing_period_end`** (subscription idempotency); optional Stripe IDs |
| `invoice_items`     | Yes     | FK `invoice_id` (cascade); **`line_item_type`** (`one_off_service`, `subscription`, `overage`, `adjustment`)                    |
| `payments`          | Yes     | FK `company_id`; nullable FK `invoice_id`, `order_id`; `payment_status`, `payment_method`; optional **`stripe_checkout_session_id`**, **`stripe_payment_intent_id`** |
| `stripe_webhook_events` | Yes | Primary key Stripe event **`id`** (`evt_*`); **`type`**; **`received_at`**, **`processed_at`**; idempotent webhook ingress |
| `refunds`           | Yes     | FK `payment_id` (cascade)                                                                                                      |
| `service_areas`     | Yes     | Coverage / pricing geography                                                                                                   |
| `pricing_rules`     | Yes     | FK nullable `service_area_id`; `service_type`; JSON `constraints`                                                              |


**Naming deviation:** PHP cannot use `\App\Models\Route` without confusion with Laravel’s routing façade. The `**routes**` table is modeled by `**OperationalRoute**` (`protected $table = 'routes'`).

---

## 2. Relationships (Eloquent)

Direction summary (inverse relations exist where Laravel infers them).


| Parent / anchor    | Related model                                                                                   | FK / linkage                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `Company`          | `CompanyLocation`, `Contact`, `Booking`, `Order`, `Knife`, `Invoice`, `Payment`, `DamageReport` | `company_id`                                                                                                                          |
| `Company`          | `Note`, `UploadedFile`                                                                          | morph `noteable` / `fileable`                                                                                                         |
| `CompanyLocation`  | `Booking`                                                                                       | `company_location_id`                                                                                                                 |
| `Booking`          | `Order`, `Knife`, `UploadedFile`                                                                | `booking_id` / morph                                                                                                                  |
| `Booking`          | `RouteStop`                                                                                     | `Booking::routeStop()` **hasOne** via `route_stops.booking_id`; if multiple stops share a booking, only the **first** hasOne resolves |
| `OperationalRoute` | `RouteStop`, `User` (`driver`)                                                                  | `route_id`; `driver_user_id`                                                                                                          |
| `RouteStop`        | `OperationalRoute`, `Booking`                                                                   | `route()` → `OperationalRoute`; `booking()` optional                                                                                  |
| `Order`            | `OrderItem`, `Knife`, `Invoice`, `Payment`, `UploadedFile`                                      | `order_id` / morph files                                                                                                              |
| `Invoice`          | `InvoiceItem`, `Payment`                                                                        | `invoice_id`                                                                                                                          |
| `Knife`            | `KnifePhoto`, `DamageReport`, `UploadedFile`                                                    | morph                                                                                                                                 |
| `Payment`          | `Refund`                                                                                        | `payment_id`                                                                                                                          |
| `User`             | `AuditLog`, `Note`, `OperationalRoute`                                                          | `actor_id`, `author_id`, `driver_user_id`, `reported_by_id` (damage)                                                                  |
| `ServiceArea`      | `PricingRule`                                                                                   | `service_area_id` nullable                                                                                                            |


Poly-type columns store **fully qualified class names** unless a morph map is added later (`Note`, `UploadedFile`, `AuditLog`).

---

## 3. Status / domain enums (PHP `BackedEnum`)

All live under `**App\Enums\`**. Persisted columns use the enum **value** (`->value`), typically `varchar(32)`.


| Enum                     | DB column hint                           | Purpose                                                                                                         |
| ------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `CompanyStatus`          | `company_status`                         | Lifecycle of sales account                                                                                      |
| `BookingStatus`          | `booking_status`                         | Visit/job pipeline                                                                                              |
| `OperationalRouteStatus` | `routes.route_status`                    | Driver route lifecycle                                                                                          |
| `RouteStopStatus`        | `route_stop_status`                      | Per-stop progress                                                                                               |
| `OrderPaymentStatus`     | **`payment_status`** on **`orders`**     | Operational expectation of invoice settlement (**distinct** from PSP `payments`) |
| `InvoiceStatus`          | `invoice_status`                         | AR lifecycle                                                                                                    |
| `PaymentStatus`          | `payment_status`                         | **Ledger semantics** on `payments`. Values: `unpaid`, `part_paid`, `paid`, `overdue`, `refunded`, `written_off` |
| `ServiceType`            | `service_type` on bookings/pricing_rules | Collection vs onsite                                                                                            |
| `PaymentMethod`          | `payment_method`                         | card, bank_transfer, cash, stripe, manual                                                                       |


**Deviation:** `**PaymentStatus`** is account-style wording (aligned with invoicing lines), distinct from Stripe “payment intents”. Document business meaning in product copy when integrating payments.

**REST JSON:** **`InvoiceJson`** maps DB **`issued_on`** / **`due_on`** to **`issue_date`** / **`due_date`**, with pence as **`subtotal`**, **`tax_total`**, **`total`**. List/detail responses add derived **`payment_status`** (**`InvoiceRollup`**) and **`overdue`**. **`PaymentJson`** exposes **`amount`** (pence) and **`paid_at`**.

---

## 4. Important indexes

Migrations duplicate some single-column indexes with composites where useful for querying.

- FK columns generally indexed implicitly or explicitly: `company_id`, `booking_id`, `order_id`, `route_id`, `invoice_id`, `**company_location_id**`, `**route_stop_status**`, `**payment_status**`, `**invoice_status**`, `**booking_status**` (inline `->index()` on status columns).
- Timeline: `**created_at**` on several tables (companies, bookings, invoices, payments, audit_logs, knife_photos, etc.).
- Geography: `**company_locations.city**`; `**companies.city**` nullable.
- Scheduling: `**bookings.scheduled_date**`; `**routes.scheduled_date**` (nullable).

---

## 5. Seed data (what exists)

Implemented in `**Database\Seeders\WeSharpDemoSeeder**` (called from `**DatabaseSeeder**`), wrapped in `**DB::transaction**`.

Rough structure:

- **Service areas**: Manchester + Liverpool coverage rows  
- **Pricing rules**: Two sample rules tied to areas (collection baseline + onsite hour style)  
- **Users**: `operations@demo.wesharp.test`, `driver@demo.wesharp.test` — password `**password`** (development only; rotate in any shared env)  
- **Companies**: 4 Manchester-style + 4 Liverpool-style fictional venues (`CompanyStatus` varies)  
- Per company: **2 contacts**, **2 locations**, **1 CRM note**, **3 bookings**, then downstream **route stops**, **orders**, **knives**, **photos/files**, optionally **damage report** (Manchester catalogue), **invoice + invoice line**, **payment** (+ **refund** on partial scenario)

Counts checked in `**tests/Feature/WeSharpDemoSeederTest`**: **8 companies**, **24 bookings**, **14 route stops**, **16 orders**, **1 operational route**.

---

## 6. Factories

`database/factories/` includes factories for `**User`** plus domain models (`**Company**` through `**PricingRule**`), aligned with `**HasFactory**` on models.

---

## 7. Deviations from an informal “original plan” (if referenced elsewhere)


| Topic                          | Implemented as                                                                                                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework table named `routes` | Eloquent `**OperationalRoute**` to avoid Laravel `Route` naming clash                                                                                                                         |
| “Route belongs to…”            | `**OperationalRoute` hasMany `RouteStop**`; `**RouteStop**` optional `booking_id`                                                                                                             |
| Booking assignment             | Assigned via `**route_stops**` rows (and `**booking_status**` transitions in seed logic); `**Booking::routeStop**` is **hasOne** (duplicate stop rows per booking not represented in helpers) |


---

## 8. Known gaps still to build (data layer adjacent)

See also `**docs/product/module-map.md`**.

- No DB-enforced uniqueness for “one stop per booking” (business rule in app/API only if needed).
- Morph map / API resource IDs not centralized.
- No row-level Laravel policies beyond empty folders scaffold.
- No automated integrity job ensuring `payments.company_id` matches `invoice.company_id` (seed logic aligns manually).

---

## Commands

See `**docs/testing/qa-checklist.md**` for migrate, seed, and verification commands.