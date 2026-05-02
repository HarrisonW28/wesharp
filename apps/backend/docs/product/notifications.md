# Notifications (Sprint 10.1)

This document describes WeSharp’s outbound notification architecture (email-first), designed to be **retry-safe**, **idempotent**, and **environment-safe**.

## Goals
- **No duplicate sends** for the same event unless intentionally resent.
- **Queue by default** for production reliability.
- **Log delivery history** (queued/sent/failed/skipped) for audit and customer support.
- **Safe by default** in dev/test: do not send real emails accidentally.

## Configuration
### Global switch
- `NOTIFICATIONS_ENABLED`
  - When `false`: notifications are **not sent**, but a `notification_deliveries` row is recorded with `status=skipped`.
  - Default: `true` only in production (`APP_ENV=production`), otherwise `false`.

### Queue controls
- `NOTIFICATIONS_EMAIL_QUEUE` (default `true`)
  - When `true`: email deliveries are dispatched to the queue (`jobs` table).
  - When `false`: email deliveries are attempted immediately (synchronous).
- `NOTIFICATIONS_QUEUE` (default `notifications`)
  - Queue name for notification jobs.

## Delivery history (`notification_deliveries`)
Each outbound notification attempt (or skip) is recorded:
- **recipient**: `recipient_email`, optional `recipient_user_id`, optional `company_id`
- **channel**: `email` (future: sms, slack, etc.)
- **type**: string key like `invoice.issued`, `booking.confirmed`, `order.status.received`
- **source**: `source_type`, `source_id` (model that triggered it)
- **status**: `queued` | `sent` | `failed` | `skipped`
- **sent_at / failed_at** + **failure_reason**
- **idempotency_key**: used for duplicate prevention

### Idempotency design
The unique constraint is:
- `(channel, type, idempotency_key)` where `idempotency_key` is not null.

If you pass the same idempotency key twice, the service returns the existing delivery row and **does not send twice**.

Recommended key:
- `NotificationService::idempotencyKey($type, $sourceType, $sourceId, $salt)`

Use a **salt** when you intentionally allow multiple notifications per same source (e.g., resend buttons).

## Email templates
- `resources/views/emails/notifications/generic.blade.php` — generic baseline
- `resources/views/emails/notifications/booking.blade.php` — booking lifecycle (`BookingEmailService`)
- `resources/views/emails/notifications/order.blade.php` — order lifecycle (`OrderEmailService`, Sprint 10.3)
- `resources/views/emails/notifications/invoice.blade.php` — invoices & payments (`InvoiceEmailService`, Sprint 10.4)
- `resources/views/emails/notifications/subscription.blade.php` — subscription lifecycle & usage (`SubscriptionEmailService`, Sprint 10.5)

Rules:
- Customer copy must be friendly and direct.
- Never include internal-only notes or audit payloads.
- Don’t embed secrets or tokens; use links to authenticated pages when possible.

## Queue + failure handling
- Email delivery uses a queueable job: `DeliverEmailNotificationJob` (tries 3).
- Retries are idempotent: if the delivery row is already `sent` or `skipped`, the job exits.
- Failures update `notification_deliveries.status=failed` with a truncated `failure_reason`.

## Customer portal URLs in email
Set `FRONTEND_URL` (see `config/wesharp.php` → `customer_portal_base_url`) so links open the Next.js app, not the API host.

## Scheduled reminders
- `invoices:send-due-soon-reminders` — runs daily at 08:00 (see `bootstrap/app.php`) for **Sent** invoices due in `INVOICE_DUE_SOON_DAYS` days (default 3). Idempotent per invoice + due date.
- `subscriptions:send-renewal-reminders` — daily at 08:00; **Active** subscriptions whose `renews_at` is exactly `SUBSCRIPTION_RENEWAL_REMINDER_DAYS` from the run date (default 7, minimum 1). Idempotent per subscription + renewal date.
- `subscriptions:send-period-usage-summaries` — daily at 08:00; **Active** subscriptions whose `renews_at` is `SUBSCRIPTION_PERIOD_SUMMARY_DAYS_BEFORE_RENEWAL` days away (default 1). Skips when that config is `<= 0`. Does not send when there is no usage in the period (all zeros). Idempotent per subscription + renewal date.

## Order notification types (10.3)
- `order.created`
- `order.status.received` … `order.status.returned` — one idempotent email per status reached
- `order.cancelled`
- `order.issue_reported` — damage report with `customer_visible=true` (source idempotency on `DamageReport`)

## Invoice & payment notification types (10.4)
- `invoice.issued` — when an invoice moves to **Sent** (admin **Send**). Resend uses a new UUID salt via `POST /api/admin/invoices/{invoice}/resend-customer-email`.
- `payment.received` — per `Payment` row (manual / settlement) or settlement-without-new-row idempotency key when “mark paid” adds no extra payment line.
- `payment.failed` — **only** from real provider-safe reasons (e.g. future Stripe path); never speculative.
- `invoice.voided`
- `invoice.reminder.overdue` — when auto-overdue promotes **Sent → Overdue** (`SyncInvoiceOverdueStatusAction`).
- `invoice.reminder.due_soon` — from scheduled command only.

**Not implemented (limitations):** customer email for **draft** invoices (drafts are hidden in the portal); hosted **pay** links in email until Stripe Checkout returns a real URL; refund / subscription credit emails until those flows exist; duplicate `invoice.issued` is prevented — use resend endpoint.

## Subscription notification types (10.5)
Lifecycle (admin subscription actions):
- `subscription.started` — company assigned an active subscription.
- `subscription.plan_changed` — plan change / new term (idempotent per subscription row).
- `subscription.cancelled` / `subscription.reactivated` — status changes from admin flows.

Scheduled / usage (from `OrderSubscriptionCoverageService` + cron):
- `subscription.renewal.upcoming` — scheduled reminder before `renews_at`.
- `subscription.usage.period_summary` — scheduled snapshot before renewal when the period has non-zero usage.
- `subscription.usage.overage` — after a **completed** order is attributed to subscription coverage with collection or knife overage on that order (idempotent per order).
- `subscription.usage.allowance_heads_up` — when period-to-date usage crosses ~80% of included allowance without overage yet (idempotent per subscription + period + dimension).

**Pending / not wired (documented):**
- `subscription.renewed` — requires a real renewal charge or provider webhook; do not simulate.
- `subscription.payment_failed` — call only from verified provider failure (`SubscriptionEmailService::sendSubscriptionPaymentFailed`).
- `subscription.expired` — call when in-app status moves to expired (`SubscriptionEmailService::sendSubscriptionExpired`).

## Admin: notification logs
- `GET /api/admin/bookings/{booking}/notifications`
- `GET /api/admin/orders/{order}/notifications`
- `GET /api/admin/invoices/{invoice}/notifications`
- `GET /api/admin/companies/{company}/subscriptions/{subscription}/notifications`

## Development safety
Defaults are chosen so local/dev/test environments do not send real emails unless explicitly configured:
- `MAIL_MAILER` defaults to `log` (see `config/mail.php`)
- `NOTIFICATIONS_ENABLED` defaults to `false` outside production

## QA
- Set `NOTIFICATIONS_ENABLED=false`, trigger a notification → row recorded as `skipped`.
- Set `NOTIFICATIONS_ENABLED=true` and `NOTIFICATIONS_EMAIL_QUEUE=false` with `Mail::fake()` in tests → row recorded as `sent`.
- Trigger twice with same idempotency key → still only one row and one send.

