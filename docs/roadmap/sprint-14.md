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
- Public pricing/subscription display should be backend-driven where possible.
- Frontend should not hardcode active subscription plans.

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

**Implemented:** Postcode check + waitlist on **`/service-areas`** (`ServiceAreaCheckerSection`); **`POST /api/public/service-area/check`** and **`POST /api/public/service-area/waitlist`** (`throttle:service-area-public`, 20/min/IP); coverage from active **`service_areas.postcode_prefix`** (longest match); next collection hint from next future **`routes`** row; **`GET /api/admin/service-area-waitlist`** (`companies.view`); table **`service_area_waitlist_signups`**; audit **`public.service_area_waitlist_signup`**; admin UI **`/admin/waitlist`**.

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
- Public package/subscription display should be backend-driven where possible.
- Frontend should not hardcode active subscription plans.
- Include a custom/bespoke option for customers who need a different plan.

### Acceptance criteria

- Customer can understand pricing.
- Calculator produces sensible estimate.
- Calculator links into booking wizard.
- Admin pricing remains source of truth where possible.
- No misleading fake prices.

**Implemented:** **`POST /api/public/pricing-estimate`** (`throttle:pricing-estimate-public`, 30/min/IP) uses **`PublicPricingEstimateService`**: pay-as-you-go totals from active **`pricing_rules`** + postcode via **`PricingRuleResolver::resolveActiveRuleForServiceTypeAndPostcode`** (refactored shared **`ruleMatchesNormalizedPostcode`**); subscription path from **`subscription_plans`** (`is_active`, `show_on_public_site`) with best-fit allowance + overage. **`/pricing`** — **`PublicPricingCalculator`**; programmes list still from **`GET /api/public/site-content`**. **`/book`** reads **`knives`**, **`postcode`**, **`programme`**, **`service`** query params to prefill the wizard.

---

## Sprint 14.2b — Backend-Driven Public Subscription Cards

### Goal

Show subscription/package cards on the public frontend using backend subscription/pricing data.

The frontend should not hardcode subscription plans if the backend already has subscription plan models.

### Public subscription cards

Show active plans as cards.

Each card should include:

- plan name
- short description
- billing interval
- price
- included collections if applicable
- included knife allowance if applicable
- overage pricing if applicable
- key benefits
- Book Now / Choose Plan CTA

### Custom plan card

Always show one additional card:

- Custom / Bespoke Plan
- for businesses with different volume, frequency or collection needs
- CTA: “Request custom plan” or “Talk to us”

This should create either:

- a lead
- a waitlist/request record
- a CRM note/request
- or a booking enquiry, depending on existing backend structures

### Backend requirements

Use backend as source of truth.

Preferred source:

- `subscription_plans`
- active plans only
- sorted by `sort_order`
- exclude deleted/inactive plans

If required, add a public endpoint such as:

GET /api/public/subscription-plans

Suggested response fields:

- id
- name
- description
- billing_interval
- price_amount_minor
- currency
- included_collections
- included_knife_allowance
- overage_price_amount_minor
- is_active
- sort_order
- public_highlights
- cta_label
- recommended

### Frontend requirements

- Fetch plans from backend.
- Render as responsive cards.
- Show loading state.
- Show empty state if no plans exist.
- Show custom plan card even if no backend plans exist.
- Do not duplicate backend pricing logic.
- Format prices in GBP.
- Link selected plan into booking/pricing flow where possible.

### Admin requirements

Admin should be able to manage the data that appears publicly, either now or later.

At minimum, plans should be driven by backend records.

Future admin fields may include:

- public visibility
- public description
- highlight bullets
- recommended flag
- CTA label
- display order

### Acceptance criteria

- Public frontend shows subscription/package cards.
- Cards are loaded from backend active subscription plans.
- Custom/bespoke plan card always appears.
- Frontend does not hardcode core plan data.
- Inactive/deleted plans do not show publicly.
- Plan CTA links into booking/enquiry flow.
- Custom plan CTA creates or starts an enquiry.
- Mobile layout works.
- Empty/loading states are handled.

**Implemented:** DB fields **`public_highlights`**, **`public_cta_label`**, **`recommended`**; shared **`PublicSubscriptionPlanCatalog::marketedPlans()`** for **`GET /api/public/subscription-plans`** (`throttle:site-content-public`, **`data.items`**), **`GET /api/public/site-content`**, and **`PublicPricingEstimateService`** subscription estimates. Admin edits marketing fields on **`/admin/subscription-plans`**. **`PublicSubscriptionPlansCatalog`** on **`/`**, **`/pricing`**, **`/subscriptions`** (loading / empty / error + always-on bespoke). Plan CTAs → **`/book?programme=subscription&plan_name=…`**; bespoke → **`custom_plan=1`** (prefills enquiry **`BookPageClient`**).

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

**Implemented:** Table **`customer_portal_invites`** (per company + normalised email, pending/accepted/expired/revoked, Clerk id + error text, rolling **14-day** expiry from last send). **`POST /api/admin/companies/{company}/portal-invites`** and **`POST .../portal-invites/{invite}/resend`** (`companies.update`) create/update invites, call **Clerk `POST /v1/invitations`** when **`CLERK_SECRET_KEY`** is set, and audit **`customer_portal_invite.sent` / `.resent`**. **`GET /api/admin/companies/{company}`** includes **`portal_invites`**. On Clerk JWT / webhook user sync, **`CustomerPortalInviteFulfillment`** links **customer** users (never staff) with **`company_id` null** to a matching non-expired pending invite and audits **`customer_portal_invite.accepted_auto`**. CRM **Users** tab: send + resend UI. Role **`clerk.default_role`** remains customer; merge rules still do not promote staff from Clerk.

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

**Implemented:** `notes.visibility` enum (**internal**, **customer**, **route**, **finance**) with default **internal** for existing rows. **`POST /api/admin/companies/{company}/notes`** accepts **`visibility`**; **`GET`** detail / **`/activity`** / overview **`recent_activity`** filter notes by viewer (**route** requires **`routes.view`**; **finance** requires invoices / **`reports.finance`** / payments / **`subscriptions.view`**). **`customer_company_notes`** on tenant **`GET /api/account/bookings/{id}`** and **`GET /api/public/track/{token}`** lists **customer** visibility only. Audit **`company.note_added`** includes **`visibility`**. CRM UI: visibility selector + labels; portal booking + tracking show **From your account team**.

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

**Implemented:** `in_app_notifications` table (per-user rows, `audience` **staff** | **customer**, `dedupe_key` uniqueness per user). **`InAppNotificationDispatcher`** fans out staff alerts (e.g. new booking → users with **`bookings.view`**; terminal email failure → **`notifications.deliveries.view`**) and customer alerts from booking / order / invoice email pipelines (customer-safe copy only). **`GET/PATCH/POST`** staff: `/api/admin/notifications/in-app` …; tenant: `/api/account/in-app-notifications` … ( **`dashboard.view`**). Next.js: bell dropdown in admin, account, and route-manager shells; full list on **`/admin/notifications`** (in-app card) and **`/account/notifications`**.

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

**Implemented:** `order_feedback` table (one row per order, unique `order_id`). On **`CompleteOrderAction`** finish, **`OrderFeedbackInvitationService`** creates the row once, sends idempotent **`order.feedback_invite`** email (honours **order** notification opt-out) + in-app **`customer.order.feedback_invite`** with `#feedback` deep link. Tenant **`GET|POST /api/account/orders/{order}/feedback`**; admin **`GET|PATCH /api/admin/companies/{company}/order-feedback`**. Portal order detail shows the feedback card; CRM company **Overview** lists feedback with **Mark reviewed** and **Approve marketing** (sets `testimonial_marketing_approved_at` only — no public quote workflow yet). Audit **`order.feedback_submitted`**.

---

## Sprint 14.7 — Sprint 14 Regression QA

### Goal

Regression test Sprint 14 only.

### Check

- service area checker
- waitlist
- pricing calculator
- packages
- backend-driven subscription cards
- custom/bespoke plan enquiry
- inactive plans hidden from public frontend
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

**Done (2026-05-01):** Full output is in [`sprint-14.7-qa-report.md`](./sprint-14.7-qa-report.md). **Verdict: PASS.**

- **QA completed:** Backend full suite + frontend typecheck, lint, Vitest, production build; checklist mapped to existing feature tests (see report table).
- **Bug found:** P0 — missing `OperationalRoutePolicy` import in `AppServiceProvider` caused policy class resolution under wrong namespace and **500** on operational-route authorization (e.g. dashboard search).
- **Bug fixed:** Added `use App\Policies\OperationalRoutePolicy;` in `AppServiceProvider`.
- **Deferred:** Physical mobile QA; optional staging smoke for portal onboarding / Clerk-first-run.