# WeSharp Sprint 14 — Customer Conversion, Onboarding and Trust

## Context

Sprint 13 makes the existing platform easier to use and safer to operate.

Sprint 14 improves customer conversion, customer onboarding and customer trust.

This should not become a full SaaS/org rebuild yet.

## Sprint 14 principles

- Do not rewrite the app.
- Do not build full CMS/page builder.
- Do not build multi-org SaaS yet.
- Reuse existing booking, pricing, subscription, route and customer models.
- Customer-facing flows should be simple and confidence-building.
- Admin tools should help staff onboard customers and reduce support.
- Backend permissions must enforce access.

---

## Sprint 14.1 — Service Area Checker and Waitlist

### Goal

Let customers check if WeSharp collects in their area before booking.

### Customer flow

Customer enters postcode.

If covered:
- “Yes, we collect in your area.”
- show next available collection day if supported
- show Book Now CTA

If not covered:
- “We do not currently cover your area.”
- offer waitlist signup

### Waitlist captures

- name
- email
- postcode
- customer type
- estimated knife count
- notes if needed

### Acceptance criteria

- Customer can check postcode/service area.
- Covered users can continue to booking.
- Out-of-area users can join waitlist.
- Admin can view waitlist leads.
- No raw technical wording.
- Works on mobile.

---

## Sprint 14.2 — Packages and Public Pricing Calculator

### Goal

Make pricing easier to understand publicly.

### Example packages

- Home Starter — up to 5 knives
- Kitchen Refresh — up to 10 knives
- Chef Pack — up to 15 knives
- Commercial Monthly — subscription

### Pricing calculator

Ask:
- How many knives?
- Home or business?
- One-off or regular?
- Subscription or one-off?

Show:
- estimated price
- package suggestion
- Book Now CTA

### Requirements

- Connect to existing pricing rules where possible.
- Do not duplicate pricing logic if backend pricing services exist.
- Clearly mark estimates as estimates if final price depends on inspection.
- Display GBP with decimals.

### Acceptance criteria

- Customer can understand pricing.
- Calculator produces sensible estimate.
- Calculator links into booking wizard.
- Admin pricing remains source of truth where possible.
- No misleading fake prices.

---

## Sprint 14.3 — Customer Invite and Portal Onboarding

### Goal

Allow admins to invite customers into the portal.

### Flow

1. Admin selects customer/company.
2. Admin sends portal invite.
3. Customer signs up/logs in.
4. Customer is linked to existing customer/company.
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
- Invite state is visible.
- Role safety is preserved.

---

## Sprint 14.4 — Internal Notes vs Customer Notes

### Goal

Make note visibility safe and obvious.

### Note types

- Internal note — staff only
- Customer note — visible to customer
- Route note — visible to driver/agent
- Finance note — finance/admin only

### Requirements

- UI must clearly show visibility.
- Internal notes must never appear in customer views.
- Customer-visible notes should be intentionally marked.
- Route notes visible only to relevant route users/admins.
- Finance notes visible only to finance/admin/developer as appropriate.
- Audit visibility changes where useful.

### Acceptance criteria

- Notes are clearly categorised.
- Customer cannot see internal notes.
- Staff cannot accidentally expose notes without clear action.
- Existing notes are handled safely.
- Note visibility is respected in timelines/tracking.

---

## Sprint 14.5 — In-App Notification Centre

### Goal

Add simple in-app notifications, not just emails.

### Admin notifications

Examples:
- new booking
- failed webhook
- failed email
- route issue
- overdue invoice
- subscription overage
- damage report

### Customer notifications

Examples:
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

## Sprint 14.6 — Customer Feedback / Review Request

### Goal

Ask customers for feedback after completed order.

### Flow

1. Order completed.
2. Customer receives request.
3. Customer rates 1–5.
4. Customer leaves optional comment.
5. Optional testimonial/review request.

### Admin view

Admin can see feedback linked to:
- customer
- booking
- order
- route/agent if relevant

### Requirements

- Do not spam customers.
- Prevent duplicate feedback requests.
- Customer feedback should be customer-safe.
- Admin can mark feedback as reviewed.
- Later marketing/testimonial use should require intentional approval.

### Acceptance criteria

- Feedback request can be sent after completion.
- Customer can submit feedback.
- Admin can view feedback.
- Duplicate requests are prevented.
- Feedback links to the correct order/customer.

---

## Sprint 14.7 — Sprint 14 Regression QA

### Goal

Regression test Sprint 14 only.

### Check

- service area checker
- waitlist
- pricing calculator
- packages
- customer invites
- portal onboarding
- note visibility
- notification centre
- feedback flow
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
- Sprint 14 final verdict: PASS / FAIL