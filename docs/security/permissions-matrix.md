# Permission matrix (`App\Support\Permissions`)

Each constant maps to Laravel enforcement points (gates, policies, form requests). Mirrors `PERMISSION_KEYS` enumerated in PHPUnit docs / OpenAPI stubs.

Legend:

- ✅ granted
- ⛔ withheld
- `scope` — allowed only inside the authorised `company_id` row tenant users represent

---


| Permission                       | Description                                                            | Typical roles                                                      |
| -------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `dashboard.view`                 | Shell dashboards internal + tenant portals                             | ✅ all                                                              |
| `companies.view`                 | CRM / directory listing                                                | ✅ staff; ✅ customer (scoped); ⛔ if company mismatch                |
| `companies.create`               | Create net-new companies (`POST /future`)                              | ✅ `super_admin`, `admin`; ⛔ others                                 |
| `companies.update`               | Mutate CRM profile                                                     | ✅ staff tiers w/CRM; ✅ customer_owner (scope)                      |
| `companies.delete`               | Dangerous teardown                                                     | ✅ `super_admin`; optional `admin` when policy tightened            |
| `bookings.view`                  | Read bookings                                                          | ✅ staff tiers; ✅ customer_staff (scoped)                           |
| `bookings.create`                | Book visits                                                            | ✅ route_manager + admin combos; ✅ customer_staff (scoped creation) |
| `bookings.update`                | Scheduling edits                                                       | ✅ operations + route_manager; ⚠ scoped customer_staff              |
| `bookings.cancel`                | Cancel pickups                                                         | ✅ finance/route_manager/admin tiers; ⚠ scoped customer_owner       |
| `routes.view`                    | Route boards                                                           | ✅ internal tiers w/logistics exposure                              |
| `routes.manage`                  | Mutate manifests                                                       | ✅ route_manager/admin/super_admin                                  |
| `route_stops.update`             | Stop-level logistics                                                   | ✅ route_manager                                                    |
| `orders.view`                    | Kitchen order desk                                                     | ✅ staff; ✅ tenant read                                             |
| `orders.create`, `orders.update` | Operational mutators                                                   | ✅ finance/route_manager/admin combos                               |
| `knives.view`                    | Asset registry visibility                                              | ✅ most roles incl. tenant viewers                                  |
| `knives.update`                  | Sharpen QA updates                                                     | ✅ route QA + admins; ⚠ scoped customer_staff where allowed         |
| `invoices.view`                  | AR visibility                                                          | ✅ finance + tenant invoicing consoles                              |
| `invoices.create` / `update`     | Bill generation                                                        | ✅ finance/admin combos                                             |
| `payments.view`                  | Payment timeline                                                       | ✅ finance + authorised tenant finance roles                        |
| `payments.manage`                | Capture manual payments/refunds surfaced to finance                    | ✅ finance + super_admin                                            |
| `payments.override`              | Write-offs exceeding automated guardrails — **dual control** workflows | ✅ finance tiers + admins (explicit constant)                       |
| `analytics.view`                 | BI tiles                                                               | ✅ staff leadership + finance                                       |
| `account.locations.manage`       | Tenant self-service **`company_locations`** create/update/delete       | ✅ `customer_owner` + `customer_staff` (scoped)                     |
| `account.settings.update`       | PATCH **`/api/account/settings`**                                      | ✅ `customer_owner` + `customer_staff`                               |

`settings.view`/`settings.manage` pair controls internal admin surfaces (invite staff, integrations). **Changing another user's role** MUST flow through `**App\Services\UserRoleService::updateRoleForUser()`** (`settings.manage`) so `audit_logs.subject_user_id` captures before/after role transitions.

Manual **`POST /api/admin/payments/manual`** enforces **`InvoicePolicy::recordManualPayment`** (**`payments.manage`** + company-scoped **`invoices.view`**); **`payments.override`** applies when **`amount_pence`** exceeds the invoice remainder (**`RecordManualPaymentAction`**).
