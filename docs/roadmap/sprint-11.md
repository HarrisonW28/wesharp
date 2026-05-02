# WeSharp Sprint 11 Roadmap

## Sprint 11.1 — Customer Trust, Service Pages and Conversion Polish

Context:
Core workflows and notifications exist. The app now needs to feel like a trustworthy customer-facing service, not just internal software.

Goal:
Improve the public/customer-facing experience so normal customers understand the service and feel confident booking.

Important:
- Do not rebuild the frontend.
- Improve copy, layout, trust signals and CTAs.
- Keep design mobile-first.
- Avoid admin wording.
- Keep pages simple and conversion-focused.

Build:
1. Homepage polish
2. Service pages for home, business, subscriptions, how it works, pricing and FAQs
3. Trust signals around tracked orders, logged knives, timestamped photos, clear pricing and customer portal
4. CTA/button improvements
5. Customer-safe language cleanup

Acceptance criteria:
- Public website clearly explains service.
- Customer can understand how to book within 60 seconds.
- Pages feel customer-facing.
- Mobile layout is readable.
- CTAs are obvious.
- No double headers/footers.
- No dead buttons.
- Customer portal copy feels friendly.

QA:
- Review homepage desktop/mobile.
- Review service pages.
- Click all CTAs.
- Check sign-in/sign-up links.
- Check mobile nav.
- Check no admin wording.
- Check no dead pages.

End with:
- files changed
- page/copy changes
- CTA list
- QA checklist
- known limitations

---

## Sprint 11.2 — Admin Operations UX Polish

Goal:
Make admin workflows clear, fast and hard to mess up.

Focus areas:
- dashboard
- customers/companies
- bookings
- routes
- orders
- knives
- invoices
- pricing
- subscriptions
- reports

Important:
- Do not add major new features.
- Improve layout, labels, buttons, empty states and actions.
- Use readable labels instead of UUIDs.
- Make status transitions obvious.
- Add confirmations for destructive actions.
- Improve mobile/tablet usability where admin is likely to use it.

Build:
1. Admin dashboard cleanup
2. Action buttons consistency
3. Empty/loading/error states
4. Status badges consistency
5. Table/card responsive improvements
6. Better related-record lookups
7. Delete/cancel confirmations
8. “Next best action” hints on detail pages
9. Clear audit/history panels where useful

Acceptance criteria:
- Admin can understand what to do next.
- Core pages are not cramped.
- Actions have clear labels.
- Dangerous actions have confirmation.
- Empty pages explain what to do.
- No raw UUIDs in normal UI.
- Mobile/tablet admin is usable.

QA:
- Test admin dashboard.
- Create/manage customer.
- Create/manage booking.
- Assign route.
- Convert to order.
- Add knives.
- Generate invoice.
- Check subscriptions/reports.
- Check mobile/tablet.
- Check permissions.

End with:
- files changed
- UX improvements summary
- QA checklist
- known limitations

---

## Sprint 11.3 — Route, Agent and Photo Evidence Polish

Goal:
Make route/agent workflows reliable and useful, especially knife photo evidence.

Important:
- Photos must be linked to correct knife/order/customer.
- Photos must be timestamped.
- Customer visibility must be controlled.
- Route user UI must be simple on mobile.
- Do not expose internal-only photos to customers.

Build:
1. Route user dashboard polish
2. Assigned route detail improvements
3. Collection/arrival/returned status flow
4. Knife photo upload/capture flow
5. Photo timestamps
6. Photo visibility flags
7. Customer-facing photo gallery if allowed
8. Admin review of photos
9. Error handling for failed uploads

Acceptance criteria:
- Route user can complete work on mobile.
- Photos can be uploaded/captured.
- Photos have timestamps.
- Photos are linked correctly.
- Customer sees only permitted photos.
- Admin can review photos.
- Failed upload is handled clearly.

QA:
- Log in as route user.
- View assigned route.
- Update stop statuses.
- Capture/upload knife photo.
- Check timestamp.
- Check admin view.
- Check customer view.
- Check permission boundaries.
- Test mobile.

End with:
- files changed
- photo workflow summary
- permission notes
- QA checklist
- known limitations

---

## Sprint 11.4 — Reporting Accuracy and Export Readiness

Goal:
Make dashboards and reports accurate enough for admin/finance use.

Important:
- Do not make pretty charts with bad data.
- Reporting must use backend-calculated values.
- Clearly separate one-off revenue, recurring revenue, overage and unpaid values.
- Add exports only where useful and simple.

Build:
1. Revenue summary accuracy
2. Booking/order volume metrics
3. Knife count metrics
4. Subscription usage metrics
5. Invoice/payment metrics
6. Route performance metrics if available
7. Customer/business metrics
8. CSV export for key reports if appropriate
9. Date filters
10. Empty/loading/error states

Acceptance criteria:
- Dashboard numbers match backend records.
- Finance can distinguish paid/unpaid/overdue.
- One-off vs subscription revenue separated.
- Overage revenue visible.
- Average knives/order visible.
- Date filters work.
- Export works if implemented.
- No misleading placeholder data.

QA:
- Create one-off order.
- Create subscription order.
- Generate invoice.
- Mark paid/unpaid.
- Confirm dashboard values.
- Test date filters.
- Test export.
- Check permissions.

End with:
- files changed
- report definitions
- metric calculation notes
- QA checklist
- known limitations

---

## Sprint 11.5 — Webhooks Foundation and Event Idempotency

Goal:
Prepare reliable webhook handling for Clerk, Stripe/payments and future external services.

Important:
- Do not enable live payment automation without staging QA.
- Verify signatures.
- Webhooks must be idempotent.
- Duplicate events must not duplicate users, invoices, payments or subscriptions.
- Log webhook events.
- Keep processing retry-safe.

Build:
1. Webhook event table/log
2. Clerk webhook handling for user.created, user.updated and user.deleted where appropriate
3. Stripe/payment webhook placeholders or handlers if Stripe exists
4. Idempotency safeguards
5. Admin/dev visibility of webhook failures if useful

Acceptance criteria:
- Webhook events are logged.
- Signatures are verified.
- Duplicate events are safely ignored/handled.
- Clerk user sync works.
- New Clerk users become customer by default.
- Admin roles are not overwritten accidentally.
- Payment/subscription events are handled or safely documented as pending.

QA:
- Send test Clerk user.created.
- Send duplicate event.
- Confirm one local user.
- Update user.
- Delete/disable user if supported.
- Send bad signature and confirm rejected.
- Test payment events if available.
- Check logs.

End with:
- files changed
- webhook event model
- provider handlers
- idempotency notes
- QA checklist
- known limitations

---

## Sprint 11.6 — Staging, GitLab Workflow and Deployment Safety

Goal:
Set up proper local/staging/production workflow so changes can be tested safely before production.

Important:
- Do not add product features.
- Do not use production Clerk/Stripe/database for staging.
- Do not commit real secrets.
- Make deployment repeatable.
- Protect production.

Build/document:
1. Environment structure: local/dev, staging, production
2. Recommended URLs: app.wesharp.co.uk, api.wesharp.co.uk, staging.wesharp.co.uk, api-staging.wesharp.co.uk
3. Env documentation for Laravel, Next, Clerk, database, CORS, mail, storage, queue/cache/session, Stripe/payment and webhook secrets
4. GitLab branch workflow: develop, staging, main, feature/*, hotfix/*
5. CI checks for backend and frontend
6. Staging, production and rollback deployment checklists
7. Clerk separation documentation
8. Staging smoke test checklist

Acceptance criteria:
- Environment plan exists.
- GitLab workflow documented.
- CI checks added/documented.
- Staging deploy checklist exists.
- Production deploy checklist exists.
- Rollback checklist exists.
- No secrets committed.
- Production protected.

End with:
- files changed
- environment plan
- GitLab workflow
- CI summary
- deployment checklist
- smoke test checklist
- remaining setup needed outside codebase
