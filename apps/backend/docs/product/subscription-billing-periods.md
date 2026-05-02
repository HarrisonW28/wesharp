# Subscription billing periods (Sprint 10.7)

## Model

- `subscription_billing_periods` rows belong to a `company_subscriptions` row. Each period has `starts_on`, `ends_on`, `period_index`, optional `closed_at`, and optional `superseded_by_period_id`.
- **Open** period: `closed_at` is null (expected: one per operational subscription).
- **Operational slot**: at most one `company_subscriptions` row per company with `status` in (`active`, `past_due`). Enforced with a partial unique index on SQLite/PostgreSQL.

## Lifecycle

- New operational subscriptions get an initial period via `SubscriptionBillingPeriodService::createInitialPeriod` (also backfilled for existing rows when the migration ran).
- **Renew**: `POST /api/admin/companies/{company}/subscriptions/{subscription}/renew-billing-period` with optional `{ "force": true }`. Closes the open period, advances `starts_at` / `renews_at` on the subscription using the plan’s billing interval, and creates the next ledger row. Sets status back to `active` if it was `past_due`.
- **Past due**: `php artisan subscriptions:sync-past-due` sets `active` → `past_due` when `renews_at` is before today (internal state; not a payment-provider webhook).

## Usage and coverage

- `OrderSubscriptionCoverageService` resolves the current window from the **open** billing period when present; otherwise it falls back to `starts_at` / `renews_at` on the subscription.
- Per-period usage for reporting/UI uses the same order cohorts (`company_subscription_id`, `completed_at` in `[start, end]`).

## Reporting

- Recurring revenue detail includes `subscription_counts.past_due`, MRR sums **active + past due** monthly snapshots, and `billing_period_ledger` counts (open periods; closed in range).

## Known limitations

- MySQL is not given a matching partial unique in this migration; production on MySQL should add an equivalent constraint or accept application-level enforcement only.
- Stripe/webhooks do not drive `past_due`; operators run the sync command or adjust status through normal subscription workflows.
- Renew rolls dates with `defaultRenewsAt`; custom calendars may need manual date edits before relying on renew.
