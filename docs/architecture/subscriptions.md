# Subscription data model (Sprint 9.1)

## Tables

### `subscription_plans`

Catalogue rows (soft-deleted, not hard-deleted). Money is stored in **minor units** (`price_amount_minor`, `overage_price_amount_minor`). `currency` is ISO 4217 (default `GBP`). Display formatting for GBP uses `App\Support\Money\MoneyFormatting::formatGbpFromPence()`.

| Column | Purpose |
|--------|---------|
| `billing_interval` | `weekly`, `monthly`, `quarterly`, `yearly` |
| `included_collections` / `included_knife_allowance` | Entitlement hints for UX and reporting (not metered usage yet) |
| `is_active` | Inactive plans cannot be assigned to new subscriptions unless code passes an explicit override (see provisioning service) |

### `company_subscriptions`

Company-specific subscription **instances** with history (soft deletes). Each row stores a **price snapshot** at assignment time (`price_amount_minor_snapshot`, `currency`) so invoice and reporting history stay accurate if catalogue prices change.

| Column | Purpose |
|--------|---------|
| `status` | `draft`, `active`, `paused`, `cancelled`, `expired` |
| `starts_at` / `renews_at` | Contract dates; `renews_at` replaces the legacy `current_period_end` concept |
| `cancelled_at` | Set when moving to cancelled |
| `billing_contact_id` | Optional FK to `contacts` (must belong to the same company) |

## Rules

1. **One active subscription per company** — enforced with a partial unique index on SQLite/PostgreSQL: `(company_id) WHERE status = 'active' AND deleted_at IS NULL`. Application services also check before insert.
2. **Inactive plans** — `CompanySubscriptionProvisioningService` rejects assigning `is_active = false` or soft-deleted plans unless `allowInactivePlan` is true (internal/admin tooling only).
3. **No hard deletes** — use soft deletes on plans and company subscriptions to preserve history and FK integrity from invoices (`source_type = company_subscription`, `source_id`).
4. **Orders/invoices** — unchanged; subscription invoices still reference `CompanySubscription` by id.

## Relationships

- `Company::subscription()` — `HasOne` **active** `CompanySubscription`.
- `Company::subscriptions()` — `HasMany` ordered history.
- `CompanySubscription::plan()` / `SubscriptionPlan::companySubscriptions()`.

## Permissions

- `subscriptions.view` — read catalogue and company subscription rows (finance, admin, route manager).
- `subscriptions.manage` — create/update plans and assign subscriptions (finance, admin, super admin).

Policies: `SubscriptionPlanPolicy`, `CompanySubscriptionPolicy`.

## Provisioning

`App\Services\Subscriptions\CompanySubscriptionProvisioningService` centralises validation (billing contact ownership, duplicate active guard, inactive plan guard, price snapshot copy, default `renews_at` from plan interval).

## API resources

`SubscriptionPlanResource`, `CompanySubscriptionResource` — JSON for future admin endpoints; money remains in minor units with optional GBP formatting fields where appropriate.

## Known limitations

- No separate **usage/entitlement ledger** table yet; allowances live on the plan and are informational.
- **MRR** in finance reporting sums **active** subscriptions on **monthly** plans using **price snapshots** only; weekly/quarterly/yearly are not annualised in MRR.
- **MySQL** — partial unique index is not created by the migration (same pattern as subscription invoice uniqueness); rely on application checks or add a DB-specific migration if production uses MySQL.
