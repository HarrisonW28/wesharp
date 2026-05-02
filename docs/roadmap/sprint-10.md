# WeSharp Sprint 10 Roadmap

Current status: Completed up to Sprint 10.2.

---

## Sprint 10.3 — Customer-Friendly Order Emails

Context:
Sprint 10.2 added booking email notification architecture and customer-friendly booking emails. Notification infrastructure now exists.

Goal:
Add customer-friendly order emails for the full order lifecycle.

Important:
- Do not rebuild the notification architecture.
- Reuse the existing mail/notification patterns from Sprint 10.2.
- Keep copy friendly, clear and reassuring.
- Emails should feel like a real customer-facing knife sharpening service.
- Admin/internal wording should not appear in customer emails.
- Include useful links back to the customer portal where available.
- Use Laravel as the source of truth.
- Do not expose raw UUIDs to customers.
- Add tests where practical.

Order email triggers:
1. Order created
2. Order confirmed
3. Knives received / logged
4. Sharpening started
5. Sharpening completed
6. Quality checked
7. Ready for return / delivery
8. Order returned / completed
9. Order cancelled
10. Order issue/damage reported if customer-visible

Email content should include:
- customer name
- order reference/readable number
- current order status
- plain-English explanation of what has happened
- next step
- customer portal link
- support/contact details
- estimated return info if available
- invoice/payment link if relevant and already available

Build:
1. Add order notification classes/templates.
2. Add customer-safe email copy.
3. Add email trigger points in order workflow actions/services.
4. Avoid duplicate sends when status is updated repeatedly.
5. Add event/notification log entries if notification logging exists.
6. Add admin-safe handling for failed sends.
7. Add preview/dev-safe way to inspect email templates if existing pattern supports it.

Acceptance criteria:
- Customer receives an email when order is created/confirmed.
- Customer receives lifecycle emails as order status changes.
- Emails use friendly customer language.
- Emails do not expose raw UUIDs.
- Duplicate emails are avoided.
- Failed emails are logged.
- Existing booking emails still work.
- Customer portal links work.
- Admin users are not spammed by customer lifecycle emails unless intended.

QA:
- Create booking and convert to order.
- Confirm order created email sends.
- Move order through each lifecycle status.
- Confirm correct email for each status.
- Confirm duplicate status save does not resend same email.
- Confirm cancelled order email sends.
- Confirm customer portal link works.
- Confirm no raw UUIDs.
- Confirm mobile email layout/readability.
- Confirm logs show notification attempts.

End with:
- files changed
- order email triggers added
- email templates added
- duplicate-send prevention notes
- QA checklist
- known limitations

---

## Sprint 10.4 — Invoice and Payment Emails

Context:
Booking and order email notification architecture exists. Orders can generate invoices or invoice drafts.

Goal:
Add customer-friendly invoice and payment emails.

Important:
- Reuse the existing notification architecture.
- Do not build a new mail system.
- Do not expose raw invoice UUIDs.
- Use customer-friendly copy.
- Keep financial wording clear and professional.
- Use GBP formatting everywhere.
- Do not fake payment confirmation.
- Payment status must come from the backend/payment source of truth.
- Failed payment/payment due messages must be clear but not aggressive.

Invoice/payment email triggers:
1. Invoice draft created, if customer-visible
2. Invoice issued/sent
3. Invoice due soon
4. Invoice overdue
5. Payment received
6. Payment failed
7. Refund issued
8. Credit/adjustment applied if supported
9. Invoice voided/cancelled

Email content should include:
- customer name
- invoice reference
- order reference if linked
- amount due
- due date
- payment status
- payment link if available
- invoice portal link
- support/contact details
- what happens next

Build:
1. Add invoice notification classes/templates.
2. Add payment notification classes/templates.
3. Connect invoice send action to invoice email.
4. Connect payment status changes to payment emails.
5. Add reminder/overdue email structure if scheduling exists.
6. Add notification logs.
7. Prevent duplicate invoice emails unless intentionally resent.
8. Add admin action for resend invoice email if appropriate.
9. Ensure invoice email uses calculated charge summary from backend.

Acceptance criteria:
- Customer receives invoice issued email.
- Payment received email sends only after real payment status changes.
- Payment failed email is customer-friendly.
- Invoice overdue/due reminder structure exists if scheduling supports it.
- Amounts display as £0.00 format.
- Invoice/order references are readable.
- No raw UUIDs exposed.
- Duplicate invoice emails are prevented.
- Admin can see/send/resend invoice email if intended.

QA:
- Generate invoice draft.
- Issue/send invoice.
- Confirm customer email content.
- Confirm amount formatting.
- Confirm payment link works if available.
- Mark payment received and confirm email.
- Simulate payment failed if supported.
- Confirm duplicate prevention.
- Confirm resend behaviour.
- Confirm customer portal invoice link.
- Confirm permissions.

End with:
- files changed
- invoice email triggers
- payment email triggers
- templates added
- resend behaviour
- QA checklist
- known limitations

---

## Sprint 10.5 — Subscription Emails

Context:
Booking, order, invoice and payment emails now exist or are being added. Subscription functionality exists or is partially implemented.

Goal:
Add customer-friendly subscription emails for plan lifecycle, renewals, usage and overages.

Important:
- Reuse existing notification architecture.
- Do not create duplicate subscription logic.
- Do not fake billing events.
- If payment provider/webhooks are not fully implemented, add safe placeholders and document what is pending.
- Customer copy should make subscriptions feel simple and useful.
- Use clear wording around allowances, overages and renewal dates.
- Use GBP formatting everywhere.
- Do not expose internal plan IDs or raw UUIDs.

Subscription email triggers:
1. Subscription started
2. Subscription plan changed
3. Subscription renewal upcoming
4. Subscription renewed
5. Subscription payment failed
6. Subscription cancelled
7. Subscription expired
8. Usage allowance nearly used
9. Usage allowance exceeded / overage started
10. Monthly/period usage summary

Email content should include:
- customer name
- plan name
- billing period
- renewal date
- included allowance
- usage so far if available
- overage amount if applicable
- customer portal link
- subscription management link if available
- support/contact details

Build:
1. Add subscription notification classes/templates.
2. Add trigger points in subscription lifecycle actions/services.
3. Add usage summary email structure if usage tracking exists.
4. Add overage warning email structure.
5. Add failed payment/cancelled subscription email.
6. Add notification logging.
7. Prevent duplicate sends.
8. Keep customer-facing copy simple.

Acceptance criteria:
- Customer receives subscription started email.
- Customer receives renewal/cancel/payment failed emails where lifecycle exists.
- Usage/overage emails are supported where usage data exists.
- Emails explain subscription allowance clearly.
- No raw UUIDs exposed.
- Emails link to customer portal.
- Failed/unsupported billing flows are documented clearly.
- Existing booking/order/invoice emails still work.

QA:
- Create subscription customer.
- Trigger subscription started email.
- Trigger plan change if supported.
- Trigger renewal reminder if supported.
- Trigger payment failed if supported.
- Trigger cancelled email.
- Test allowance/overage email if usage data exists.
- Confirm no duplicate sends.
- Confirm portal links.
- Confirm mobile email readability.

End with:
- files changed
- subscription email triggers
- templates added
- usage/overage handling
- QA checklist
- known limitations

---

## Sprint 10.6 — Pricing, Knife Counts, Subscription Usage and Revenue Accuracy

Context:
WeSharp has bookings, orders, knives, pricing/invoices/subscriptions/reporting foundations and customer/admin workflows. Email notifications now cover bookings, orders, invoices/payments and subscriptions.

Problem:
There needs to be a complete admin/backend workflow for setting price per knife/service, applying that pricing to bookings/orders, counting how many knives/items should be charged, and separating one-off revenue from subscription-covered work and overage revenue.

Goal:
Create or complete a proper pricing and revenue accuracy layer.

Important:
- Do not rewrite the whole app.
- Laravel remains the source of truth for pricing, charges and permissions.
- Clerk handles authentication only.
- Do not hardcode prices in the frontend.
- Use GBP formatting everywhere, e.g. £12.50.
- Store money safely, preferably in minor units.
- Keep controllers thin.
- Use Actions/Services/Requests/Resources where appropriate.
- Avoid duplicate pricing logic between frontend, invoices, subscriptions and reporting.
- Customer-facing views must use friendly wording.
- Admin views must be operational and clear.
- Update docs where pricing/subscription/revenue behaviour changes.

Build:
1. Pricing rules/service pricing
2. Order item pricing
3. Booking estimated count vs order actual count
4. Backend charge calculation service
5. Subscription-aware pricing
6. Manual overrides
7. Invoice integration
8. Dashboard/reporting metrics
9. Customer portal display
10. Validation and permissions
11. Audit logs

Acceptance criteria:
- Admin can create/manage price per knife/service.
- Admin can add priced items to order.
- Admin can set quantity.
- Booking shows estimated knife count.
- Order shows actual knife count.
- Totals calculated server-side.
- Prices show GBP decimals.
- Subscription customers can have covered/overage items.
- One-off customers charged normally.
- Manual overrides require reason and are audited.
- Invoice drafts use calculated charge summary.
- Dashboard/reporting distinguishes one-off, subscription-covered and overage revenue.
- Customer portal shows friendly pricing/order summaries.
- No raw UUIDs in normal pricing flows.
- Customer users cannot access pricing admin.

QA:
- Create/edit/deactivate pricing rule.
- Try inactive rule.
- Create booking with estimated knife count.
- Convert booking to order.
- Add one priced item.
- Add multiple items with quantity.
- Confirm total updates.
- Override without reason and confirm blocked.
- Override with reason and confirm audit.
- Mark complimentary and confirm total.
- Test subscription customer if data exists.
- Test one-off customer.
- Generate invoice draft and check line items.
- Confirm no duplicate invoice.
- Check customer portal.
- Check dashboard/reporting metrics.
- Test permissions.

End with:
- files changed
- migrations added
- pricing model summary
- charge calculation rules
- subscription coverage behaviour
- invoice integration notes
- dashboard/reporting notes
- QA checklist
- known limitations

---

## Sprint 10.7 — Subscription Billing Periods, Renewals and Recurring Revenue Dashboard

Context:
Sprint 10.6 created/improved pricing, knife counts, subscription usage and revenue accuracy. We now need proper subscription periods and recurring revenue reporting.

Goal:
Make subscriptions measurable and operational by adding billing periods, renewal tracking, recurring revenue metrics and usage period reporting.

Important:
- Reuse PricingService/OrderChargeCalculator from Sprint 10.6.
- Do not create a second pricing system.
- Do not fake live billing provider data.
- If Stripe/payment provider is not fully connected, use safe internal lifecycle states and document what is pending.
- Recurring revenue reporting must be based on active subscription records.
- Use GBP formatting everywhere.
- Keep admin UI clear and finance-friendly.

Build:
1. Subscription billing periods
2. Subscription lifecycle statuses
3. Usage by billing period
4. Recurring revenue metrics
5. Admin subscription dashboard
6. Customer subscription view
7. Renewal handling
8. Reporting API/resources

Acceptance criteria:
- Subscription periods are visible and tracked.
- Usage is grouped by billing period.
- Admin can see active subscriptions and renewal dates.
- Dashboard shows recurring revenue summary.
- Customer can see their plan/usage in friendly wording.
- Overage is separated from base subscription revenue.
- One-off and recurring revenue are separate.
- Duplicate renewal processing is prevented.
- No raw UUIDs shown in normal UI.

QA:
- Create active subscription.
- Check current period.
- Add orders/items during period.
- Confirm usage increases.
- Confirm allowance remaining.
- Confirm overage calculation.
- Check customer subscription page.
- Check admin subscription dashboard.
- Check recurring revenue dashboard.
- Test cancelled/expired/past_due statuses.
- Test renewal due behaviour if implemented.
- Confirm permissions.
- Price setting on subscriptions is decimal field, it incrementally icnrease by +1 at the moment

End with:
- files changed
- migrations added
- subscription period model
- recurring revenue calculations
- usage/overage logic
- dashboard changes
- QA checklist
- known limitations

---

## Sprint 10.8 — Notification Preferences and Email Reliability

Context:
Booking, order, invoice/payment and subscription emails now exist. The system needs reliability controls and customer/admin preferences.

Goal:
Improve email notification reliability, preferences, logging and resend behaviour.

Important:
- Do not rebuild the email system.
- Reuse notification architecture.
- Keep customer preferences simple.
- Critical operational emails should not be accidentally disabled unless intended.
- Failed sends should be visible to admin.
- Avoid duplicate notifications.
- Support future SMS/push channels without building them now.

Build:
1. Notification preferences
2. Admin notification settings
3. Notification log
4. Duplicate prevention
5. Resend behaviour
6. Email preview/testing
7. Documentation

Acceptance criteria:
- Preferences exist for major notification categories.
- Transactional emails remain safe.
- Notification logs show sent/failed state.
- Admin can see failed notifications.
- Duplicate emails are prevented.
- Resend works where intended.
- Existing emails still send correctly.
- Customer language remains friendly.

QA:
- Toggle notification preference.
- Trigger booking email.
- Trigger order email.
- Trigger invoice email.
- Trigger subscription email.
- Confirm disabled categories are respected where appropriate.
- Confirm critical emails still send if required.
- Simulate failed send if possible.
- Confirm failed log.
- Resend invoice email.
- Confirm duplicate prevention.
- Test permissions.

End with:
- files changed
- preference model/fields
- notification log changes
- resend rules
- QA checklist
- known limitations

---

## Sprint 10.9 — Notifications, Pricing and Subscription Revenue Regression QA

### Context
Sprints 10.3–10.8 added or improved:
- customer-friendly order emails
- invoice and payment emails
- subscription emails
- pricing, knife counts and charge calculation
- subscription billing periods, renewals and recurring revenue dashboard
- notification preferences, logs and email reliability

### Goal
Regression test all Sprint 10 work together and fix integration bugs before moving into Sprint 11.

### Rules
- Do not add new product features.
- Do not start Sprint 11 work.
- Fix only bugs related to Sprint 10 work.
- Prioritise notification reliability, duplicate prevention, pricing accuracy, invoice accuracy, subscription usage and customer-safe wording.
- If a wider issue is found, document it unless it blocks Sprint 10 functionality.

### QA areas

#### 1. Email notification regression
Check:
- booking emails from Sprint 10.2 still work
- order lifecycle emails send correctly
- invoice/payment emails send correctly
- subscription emails send correctly
- duplicate-send prevention works
- failed sends are logged
- notification preferences are respected
- resend behaviour works where implemented
- email copy is customer-friendly
- emails do not expose raw UUIDs

#### 2. Order and pricing regression
Check:
- booking estimated knife count
- order actual knife count
- order item quantity
- price per knife/service
- manual overrides
- complimentary items
- subscription-covered items
- overage items
- GBP formatting
- invoice line items match calculated charge summary

#### 3. Invoice/payment regression
Check:
- invoice draft generation
- invoice issued/sent email
- invoice amount matches order charge summary
- payment received notification
- payment failed notification if supported
- duplicate invoice emails are prevented
- duplicate invoice generation is prevented unless intentionally allowed

#### 4. Subscription/revenue regression
Check:
- active subscriptions
- subscription plan display
- billing period dates
- usage in current period
- allowance remaining
- overage quantity/value
- renewal dates
- recurring revenue dashboard
- one-off vs recurring revenue split
- unpaid invoice value
- no duplicate revenue counting

#### 5. Customer portal regression
Check:
- customer sees booking/order status
- customer sees friendly order/pricing summary
- customer sees invoice/payment status
- customer sees subscription usage if applicable
- customer does not see internal notes
- customer does not see raw UUIDs
- customer cannot access admin/pricing management

#### 6. Admin/finance regression
Check:
- admin can manage pricing
- admin can add priced order items
- admin can issue invoice
- admin can view notification logs
- finance can view invoices/revenue where intended
- role permissions remain correct
- route users do not gain finance/admin powers

### Acceptance criteria
- Sprint 10 features work together.
- No duplicated emails in normal workflows.
- No duplicate invoice/revenue records.
- Pricing totals match invoice totals.
- Subscription usage matches reporting.
- Customer-facing copy is friendly.
- Permissions remain correct.
- No P0/P1 bugs remain from Sprint 10.
- Any deferred issues are clearly documented.

### Required output
At the end, provide:
- QA checks completed
- bugs found
- bugs fixed
- files changed
- deferred issues
- Sprint 10 final verdict: PASS / FAIL