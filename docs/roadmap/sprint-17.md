# WeSharp Sprint 17 — Service Area Map, Postcode Coverage and Frontend Checker

## Context

WeSharp needs a clear way for admins to define accepted service areas and for customers to check whether their address/postcode is covered.

The preferred admin experience is visual: show a map, define locations/areas, and set accepted radius/coverage rules. The frontend should use this to tell customers if they can book.

## Sprint principles

- Do not rebuild the whole booking system.
- Reuse existing service area data where possible.
- Avoid hardcoding coverage only in frontend.
- Backend is source of truth for service area checks.
- Frontend checker should be simple and friendly.
- Admin map should be useful, not overcomplicated.
- Document any mapping provider/env requirements.

---

## 17.1 — Service Area Data Model Audit

### Goal

Audit existing service area/postcode data and decide the simplest safe model.

### Consider

- postcode prefix rules
- radius around depot/base point
- multiple service zones
- active/inactive areas
- admin labels
- collection day hints
- future waitlist support

### Acceptance criteria

- Existing service area implementation is understood.
- Gaps are documented.
- A simple target model is chosen.
- No duplicate service area system is created if one exists.

---

## 17.2 — Admin Service Area Map and Radius UI

### Goal

Allow admin users to manage accepted coverage visually.

### Build

- admin service area page
- map display
- base/depot marker or service zone marker
- radius input in miles/km
- visible coverage circle
- area label/name
- active/inactive toggle
- postcode prefix fallback if needed
- save/update/delete with confirmation

### Requirements

- Use an appropriate map provider/library already compatible with the stack.
- Keep provider keys in env variables.
- Do not expose private server keys to frontend.
- If map provider setup is too large, create a clean placeholder with documented env requirements.

### Acceptance criteria

- Admin can create/edit service coverage area.
- Map shows approximate accepted radius.
- Admin can see what area is active.
- Service areas are stored backend-side.
- Permissions protect admin management.

---

## 17.3 — Backend Coverage Check API

### Goal

Provide a backend endpoint/service to check if a postcode/address is covered.

### Build

- validation for postcode/address input
- normalise UK postcodes where possible
- service area check using radius/prefix rules
- response with covered true/false
- optional next available day/area label if available
- clear error for invalid/unsupported input

### Acceptance criteria

- Frontend can call coverage check.
- Backend enforces service area logic.
- Covered and not-covered responses are clear.
- Invalid postcodes are handled cleanly.

---

## 17.4 — Public Service Area Checker

### Goal

Let customers check coverage before or during booking.

### Build

- public postcode checker component
- friendly covered/not-covered result
- Book Now CTA if covered
- waitlist CTA if not covered, if available
- link into booking wizard with postcode/address prefilled where practical

### Acceptance criteria

- Customer can check if WeSharp serves their area.
- Result is friendly and clear.
- Covered customers can continue booking.
- Mobile layout works.

---

## 17.5 — Booking Wizard Coverage Integration

### Goal

Integrate service area checking into booking without overfacing customers.

### Behaviour

- ask for postcode/address early enough to prevent wasted effort
- show helpful message if covered
- show waitlist/support path if not covered
- do not block admin-created bookings unless business rules require it
- allow internal override only with correct permission/reason if needed

### Acceptance criteria

- Booking flow checks coverage clearly.
- Out-of-area customers are not led through full booking unnecessarily.
- Admin override is controlled if implemented.
- Backend still validates coverage where required.

---

## 17.6 — Waitlist / Out-of-Area Leads

### Goal

Capture demand outside the current service area.

### Build

- waitlist capture form
- name/email/postcode/customer type
- estimated knife count
- source
- consent fields where appropriate
- admin waitlist list/view

### Acceptance criteria

- Out-of-area customer can join waitlist.
- Admin can view waitlist leads.
- Consent is not confused with terms.
- Data is validated.

---

## 17.7 — Sprint 17 Regression QA

### Goal

Regression test Sprint 17 only.

### Check

- admin map/radius UI
- service area CRUD
- backend coverage API
- public checker
- booking integration
- waitlist
- permissions
- mobile responsiveness
- env/provider docs

### Required output

At the end, provide:
- QA checks completed
- bugs found
- bugs fixed
- files changed
- deferred mapping issues
- Sprint 17 verdict: PASS / FAIL
