# Audit logging — MVP

## What is recorded

- **`audit_logs`** rows created via **`AuditRecorder::record()`** on high-value domain events (companies, bookings, routes, invoices/payments per product docs).
- Columns: **`actor_id`** (nullable for system/public events), **`auditable_type` / `auditable_id`**, **`action`**, JSON **`payload`**, **`ip_address`**, **`created_at`**.

## Sensitive admin actions

Examples covered in code paths include (non-exhaustive): **`company.created`**, **`booking.*`**, **`route.*`**, **`invoice.*`**, **`payment.recorded.manual`**, **`booking.created_from_public_enquiry`**, **`public.booking_enquiry`** (null actor).

## Gaps / known risks

- Not every **`PUT`** on low-risk fields emits an audit row — expand as compliance needs harden.
- Public enquiry audits use **`actor_id = null`** — reporting must not assume a user join.

## Manual QA

1. Perform a visible mutation in admin (e.g. create company, confirm booking) → query **`audit_logs`** for matching **`action`** and **`actor_id`**.
2. Submit **`/api/public/booking-enquiries`** → confirm **`public.booking_enquiry`** with null actor.

## Tests

- Behavioural coverage lives in feature tests that assert side effects where critical (e.g. public booking creates audit rows). Dedicated audit middleware is **not** implemented in MVP.
