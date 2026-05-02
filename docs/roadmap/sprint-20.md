# WeSharp Sprint 20 — Customer Invites, Note Safety, Notification Centre and Feedback

## Context

This sprint improves customer onboarding, internal safety and customer trust without rebuilding core modules.

## Sprint principles

- Do not build a full helpdesk.
- Do not build complex marketing automation.
- Keep customer data isolated.
- Keep internal notes private by default.
- Laravel remains source of truth for roles/company access.
- Clerk remains authentication only.

---

## 20.1 — Customer Invite and Portal Onboarding

### Goal

Allow admins to invite customers into the portal.

### Flow

1. Admin selects customer/company.
2. Admin sends portal invite.
3. Customer signs up/logs in.
4. Customer links to existing customer/company.
5. Customer sees allowed bookings/orders/invoices/subscription.

### Requirements

- New users default to customer role.
- Do not overwrite admin/developer roles accidentally.
- Invite status visible in CRM.
- Resend invite supported.
- Expired/used invite states handled.
- Audit invite events.

### Acceptance criteria

- Admin can invite customer.
- Customer can complete onboarding.
- Customer gets correct portal access.
- Customer cannot access another company/customer.
- Role safety is preserved.

---

## 20.2 — Internal Notes vs Customer Notes

### Goal

Make note visibility safe and obvious.

### Note types

- Internal note — staff only
- Customer note — visible to customer
- Route note — visible to driver/agent
- Finance note — finance/admin only

### Requirements

- UI clearly shows visibility.
- Internal notes never appear in customer views.
- Customer-visible notes are intentionally marked.
- Route notes visible only to relevant users/admins.
- Finance notes visible only to relevant roles.
- Audit visibility changes where useful.

### Acceptance criteria

- Notes are clearly categorised.
- Customer cannot see internal notes.
- Staff cannot accidentally expose notes without clear action.
- Existing notes are handled safely.
- Note visibility is respected in timelines/tracking.

---

## 20.3 — In-App Notification Centre

### Goal

Add simple in-app notifications, not just emails.

### Admin notifications

- new booking
- failed webhook
- failed email
- route issue
- overdue invoice
- subscription overage
- damage report

### Customer notifications

- booking confirmed
- order updated
- invoice issued
- payment received
- photos uploaded
- subscription renewing

### Requirements

- Start simple.
- Notification list/dropdown/page.
- Mark read/unread.
- Link to relevant record.
- Role-aware and customer-safe.
- Do not expose internal data to customers.

### Acceptance criteria

- Admin can see relevant notifications.
- Customer can see customer-safe notifications.
- Notifications link to correct pages.
- Read/unread works.
- Permissions are enforced.

---

## 20.4 — Customer Feedback and Review Request

### Goal

Ask customers for feedback after completed order.

### Flow

1. Order completed.
2. Customer receives request.
3. Customer rates 1–5.
4. Customer leaves optional comment.
5. Optional testimonial/review request.

### Requirements

- Do not spam customers.
- Prevent duplicate feedback requests.
- Feedback links to customer/order/booking.
- Admin can mark feedback reviewed.
- Testimonial/public use requires intentional approval.

### Acceptance criteria

- Feedback request can be sent after completion.
- Customer can submit feedback.
- Admin can view feedback.
- Duplicate requests are prevented.
- Feedback links to correct order/customer.

---

## 20.5 — Support / Issue Intake Lite

### Goal

Create a simple way to collect support issues without building a full helpdesk.

### Options

- customer support form
- admin issue intake
- link issue to booking/order/customer
- internal notes
- issue status
- owner/assignee if already supported

### Acceptance criteria

- Customer/staff can raise an issue.
- Admin can view issue.
- Issue can link to relevant records.
- Support process is documented.
- Customer data stays protected.

---

## 20.6 — Sprint 20 Regression QA

### Goal

Regression test Sprint 20 only.

### Check

- customer invites
- portal onboarding
- roles/company access
- note visibility
- notification centre
- feedback flow
- support intake
- permissions
- customer data isolation
- mobile UX

### Required output

At the end, provide:
- QA checks completed
- bugs found
- bugs fixed
- files changed
- deferred issues
- Sprint 20 verdict: PASS / FAIL
