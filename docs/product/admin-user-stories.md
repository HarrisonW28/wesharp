# Admin CRM — user stories (MVP)

## Staff overview

**As internal staff**, I want a searchable list of accounts so that I can find a kitchen quickly by name, city, or lifecycle status.

**As internal staff**, I want pagination and deterministic sort so large tenant lists remain usable.

**As internal staff**, I want to create a lightweight account shell so onboarding can proceed before full data exists.

---

## Deep account work

**As internal staff**, I want a profile that shows KPIs so I understand commercial health without running reports.

**As internal staff**, I want to add contacts and sites so field operations reference real people and addresses.

**As internal staff**, I want notes and an activity feed so conversations and audits are attributable over time.

**As internal staff**, I want to move an account across **Lead → Active → At risk → Lost** (and related states) so leadership views match operational reality.

**As internal staff**, I want to request a booking against a validated site so collections can be planned from CRM (subject to `bookings.create`).

---

## Booking operations (admin)

**As internal staff**, I want to filter bookings by city, requested date, service mode, and pipeline status so dispatch can focus on today’s workload.

**As dispatch**, I want to confirm inbound requests so only accepted visits hit routing boards.

**As route planning**, I want to attach bookings to operational routes that share the same calendar day so vans stay coherent.

**As workshop intake**, I want to spin up a draft order from an accepted routing context without double-entering billing metadata.

---

## Non-goals (MVP)

- Automated marketing journeys, enrichment, outbound email sequencing.
- Full quote-to-cash quoting inside CRM screens (orders/invoices remain read-centric tables).
