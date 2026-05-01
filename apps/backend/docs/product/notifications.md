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
- **type**: string key like `invoice.sent`, `booking.confirmed`
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
Current baseline HTML template:
- `resources/views/emails/notifications/generic.blade.php`

Rules:
- Customer copy must be friendly and direct.
- Never include internal-only notes or audit payloads.
- Don’t embed secrets or tokens; use links to authenticated pages when possible.

## Queue + failure handling
- Email delivery uses a queueable job: `DeliverEmailNotificationJob` (tries 3).
- Retries are idempotent: if the delivery row is already `sent` or `skipped`, the job exits.
- Failures update `notification_deliveries.status=failed` with a truncated `failure_reason`.

## Development safety
Defaults are chosen so local/dev/test environments do not send real emails unless explicitly configured:
- `MAIL_MAILER` defaults to `log` (see `config/mail.php`)
- `NOTIFICATIONS_ENABLED` defaults to `false` outside production

## QA
- Set `NOTIFICATIONS_ENABLED=false`, trigger a notification → row recorded as `skipped`.
- Set `NOTIFICATIONS_ENABLED=true` and `NOTIFICATIONS_EMAIL_QUEUE=false` with `Mail::fake()` in tests → row recorded as `sent`.
- Trigger twice with same idempotency key → still only one row and one send.

