# WeSharp Sprint 18 — Premium Public Website and Ultimate Frontend

## Context

The platform needs a stronger customer-facing website that feels premium, trustworthy and conversion-focused.

This sprint should improve the public frontend substantially. Tasteful Three.js/motion can be used if it supports the brand and does not hurt performance or accessibility.

## Sprint principles

- Do not turn this into a full CMS/page builder.
- Do not break customer portal/admin app.
- Public pages should be fast, responsive and SEO-friendly.
- Motion/Three.js must be tasteful, optional and performant.
- Do not add heavy effects that make booking harder.
- Customer conversion matters more than flashy visuals.
- Reuse content settings where available.

---

## 18.1 — Public Website IA and Content Audit

### Goal

Audit public pages and define a stronger website structure.

### Suggested pages/sections

- Home
- How it works
- Services
- Pricing/packages
- Service areas
- Commercial sharpening
- FAQs
- About/Trust
- Contact
- Book now

### Acceptance criteria

- Public website structure is clear.
- Missing/weak pages are documented.
- Duplicate/confusing copy is identified.
- Clear customer journey is defined.

---

## 18.2 — Premium Homepage Redesign

### Goal

Make the homepage feel like a polished, trustworthy knife sharpening brand.

### Include

- strong hero section
- clear primary CTA
- secondary CTA
- simple value proposition
- trust indicators
- how it works preview
- service area checker entry
- package/pricing teaser
- customer/commercial split where useful
- responsive design

### Acceptance criteria

- Homepage feels premium and customer-friendly.
- CTA journey is obvious.
- Mobile homepage works well.
- No excessive animation/performance issues.

---

## 18.3 — Services, Packages and Pricing Pages

### Goal

Create/improve pages explaining services and pricing clearly.

### Include

- home sharpening packages
- commercial plans
- one-off vs subscription explanation
- what is included
- overage/extra knife explanation where needed
- GBP formatting
- Book Now CTAs

### Acceptance criteria

- Customers understand what they can buy.
- Pricing does not conflict with backend rules.
- Calculator/service area checker links are clear where implemented.
- Pages are responsive.

---

## 18.4 — How It Works, Trust and FAQ

### Goal

Reduce customer uncertainty.

### Include

- collection process
- how knives are logged
- photo evidence explanation
- quality check/return process
- safety/trust copy
- FAQs
- support details
- business/commercial reassurance

### Acceptance criteria

- Customers understand the process.
- Common objections are answered.
- Trust is improved.
- Copy is customer-facing, not admin/internal.

---

## 18.5 — Tasteful Three.js / Motion Polish

### Goal

Add premium visual polish where useful, without hurting usability.

### Options

- subtle knife/edge visual
- premium hero background motion
- 3D blade glint/abstract sharpening visual
- scroll-based microinteractions
- animated process steps

### Rules

- Must degrade gracefully.
- Must not block content.
- Must not hurt mobile performance.
- Respect reduced motion preferences.
- Avoid gimmicky effects.
- Do not load large assets unnecessarily.

### Acceptance criteria

- Motion improves brand feel.
- Page remains fast and accessible.
- Reduced motion is respected.
- Mobile performance remains acceptable.

---

## 18.6 — Customer CTA Journey Polish

### Goal

Make every public page guide users toward booking or checking service area.

### Improve

- Book Now CTAs
- service area checker CTAs
- commercial enquiry CTAs
- sticky mobile CTA if appropriate
- booking wizard handoff
- post-checker prefilled booking flow if available

### Acceptance criteria

- Customer always knows next step.
- CTAs are consistent.
- Booking journey is not buried.
- Mobile CTA works well.

---

## 18.7 — SEO, Performance and Accessibility Pass

### Goal

Make public pages technically solid.

### Check

- titles/meta descriptions
- semantic headings
- Open Graph where useful
- alt text
- image optimisation
- lazy loading
- accessibility labels
- keyboard navigation
- colour contrast
- reduced motion
- Core Web Vitals basics

### Acceptance criteria

- Public pages are SEO-ready.
- Performance is not damaged by visual polish.
- Accessibility is not worsened.

---

## 18.8 — Sprint 18 Regression QA

### Goal

Regression test Sprint 18 only.

### Check

- homepage
- services/pricing pages
- FAQs/how-it-works
- CTAs
- Three.js/motion fallback
- mobile
- SEO basics
- accessibility basics
- customer booking handoff
- admin/customer portal unaffected

### Required output

At the end, provide:
- QA checks completed
- bugs found
- bugs fixed
- files changed
- deferred public website issues
- Sprint 18 verdict: PASS / FAIL
