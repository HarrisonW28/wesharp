# WeSharp Sprint 21 — Mobile App Readiness and PWA Foundation

## Context

Before building a native app, WeSharp should work like a mobile app using the existing Next.js frontend.

Best route:
- PWA first
- Capacitor wrapper later if App Store/Play Store needed
- React Native only much later if heavy native/offline/background GPS is required

## Sprint principles

- Do not build React Native yet.
- Do not duplicate the frontend.
- Do not rewrite the app.
- Keep Laravel API and Clerk auth.
- Focus on customer, POS and route-agent mobile experience.
- Admin can remain more desktop-oriented, but should still be usable.
- Camera/photo capture must support route and knife evidence workflows.
- Avoid complex offline sync unless simple draft/retry handling is practical.

---

## 21.1 — PWA Install Support

### Goal

Make the app installable to home screen.

### Build

- web app manifest
- app name and short name
- theme colour
- background colour
- standalone display mode
- app icons
- Apple touch icon
- mobile viewport checks

### Acceptance criteria

- WeSharp can be added to home screen.
- App icon/name displays correctly.
- App opens in standalone/app-like mode where supported.

---

## 21.2 — Mobile App Shell and Navigation

### Goal

Make mobile navigation app-like and easy.

### Improve

- customer mobile nav
- route-agent mobile nav
- POS tablet/mobile layout
- bottom navigation where useful
- safe area spacing
- back navigation
- sign-in/sign-up mobile UX

### Acceptance criteria

- Navigation feels usable on mobile.
- Route/POS actions are easy to reach.
- No tiny tap targets.
- Desktop usage is not broken.

---

## 21.3 — Camera and Photo Capture UX

### Goal

Improve camera capture for photo evidence.

### Photo types

- before photos
- after photos
- damage photos
- route stop photos
- knife photos

### Support

- mobile camera capture
- timestamp
- uploaded by
- linked booking/order/knife/route stop
- customer-visible flag
- retry or clear error if upload fails

### Acceptance criteria

- Mobile camera capture works.
- Photos are linked correctly.
- Customer visibility remains explicit.
- Failed upload can be retried or does not destroy workflow.

---

## 21.4 — Draft and Retry Behaviour

### Goal

Avoid losing operational data on mobile.

### For POS/route flows

- save draft locally where practical
- show unsaved/not-synced state where practical
- allow retry failed photo upload
- preserve entered data between steps
- avoid blocking route completion unnecessarily

### Acceptance criteria

- POS/route data is not easily lost.
- Failed upload has recovery path.
- Optional photos/notes can be completed later.

---

## 21.5 — Install Prompt and Mobile Help

### Goal

Help users add WeSharp to their home screen without being annoying.

### Build

- simple Add to Home Screen guidance
- iPhone/Android instructions where appropriate
- do not repeatedly nag users
- staff help note for route/POS users

### Acceptance criteria

- Users can find install guidance.
- Prompt/help is not intrusive.
- Instructions are clear.

---

## 21.6 — Sprint 21 Regression QA

### Goal

Regression test Sprint 21 only.

### Check

- iPhone Safari if available
- Android Chrome if available
- add to home screen
- open from home screen
- login
- customer booking
- customer tracking
- POS flow
- route-agent flow
- camera upload
- failed upload/retry
- mobile nav
- back navigation
- desktop unaffected

### Required output

At the end, provide:
- QA checks completed
- bugs found
- bugs fixed
- files changed
- deferred mobile issues
- Sprint 21 verdict: PASS / FAIL
