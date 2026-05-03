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

### Implemented (2026-05-01)

Audit write-up: [`sprint-18.1-public-website-ia-audit.md`](./sprint-18.1-public-website-ia-audit.md) — route map, nav source of truth, gap analysis (notably **About/trust** and **commercial sharpening** naming), copy overlap notes, recommended journeys, footer/header labelling note.

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

### Implemented (2026-05-01)

- **Hero** (`HomeHero`): two-column layout on large screens (headline + **primary** “Book” and **secondary** “Check your postcode” to `#check-coverage`; **tertiary** links for pricing & how-it-works); trust points in a **card**; **`useReducedMotion`** short-circuits Framer durations.
- **Live checker** on home: `ServiceAreaCheckerSection` under `#check-coverage`, with static area chips + note that the checker is authoritative.
- **Paths split**: “Home cooks & single kitchens” vs “Business & hospitality” cards with CTAs to book/pricing vs trade/programmes.
- **IA**: removed duplicate mid-page `#areas` band (coverage lives in checker section).
- **SEO**: `metadata` title/description/OpenGraph on `/`.
- **CMS**: `homepage.cta_coverage` in Laravel defaults, validation, TS defaults, and **Content settings → Homepage** editor.

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
- Pricing and subscriptions driven by backend/API where shown.
- Calculator/service area checker links are clear where implemented.
- Pages are responsive.

### Implemented (2026-05-01)

- **`/services`**: Structured sections for **pay-as-you-go vs programme**, **commercial / trade**, **what’s included**, coverage callout with link to **`/service-areas`**, and booking CTAs; **metadata**; reinforces **GBP** and API-aligned wording.
- **`/pricing`**: **GBP + API sourcing** callout, **one-off vs subscription** explainer (**overage**), prominent **postcode checker** link, existing **calculator** + **`PublicSubscriptionPlansCatalog`**; **metadata**.
- **`/subscriptions`**: **CMS** title/lead via new **`subscriptions_page`** (PHP/TS defaults, validation, **Content settings → Services & pricing**); overage + payg-first explainer with link to calculator; **metadata**; catalogue still **`GET /api/public/subscription-plans`**.
- **`PublicPricingCalculator`**: description states amounts are **GBP (£)**.

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

### Implemented (2026-05-01)

- **CMS defaults** (`how_it_works`, `faq`, new **`safety_page`**): collection → logging → photos (customer-visible vs internal) → QC → return/portal; FAQ additions (damage in care, RAMS/site rules); **`UpdateSiteContentRequest`** validates `safety_page`.
- **Public**: **`/how-it-works`** — metadata, promo cards (safety, coverage, trade, FAQ), bottom Book/Contact (`showFooterCtas={false}` to avoid duplicate article footers); **`/faq`** — metadata + “Still unsure?” with safety/how-it-works links; **`/safety`** — **`site.safety_page`** copy + CTAs.
- **Admin**: **Content settings → Safety & trust** for title, lead, bullet list; hub link from content-settings index.

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

### Implemented (2026-05-01)

- **No Three.js bundle** — avoided `@react-three/*` / `three` to keep JS weight and mobile GPU cost down; polish uses **Framer Motion** plus **CSS keyframes** for ambient motion.
- **Hero** (`HomeHero`): extra `md+` only blurred gradient blobs and `lg+` abstract **edge / glint** strip (`pointer-events-none`); animations in `globals.css` with **`prefers-reduced-motion: reduce`** disabling them.
- **Home “How it works”**: **`HomeHowStepsGrid`** — scroll-triggered **staggered** `whileInView` reveals; **`useReducedMotion`** skips entrance motion.
- **Accessibility**: Decorative layers `aria-hidden`; content and CTAs unchanged; no blocking loaders.

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

### Implemented (2026-05-01)

- **`MarketingArticle`** default footer: **Book a collection** · **Check coverage** (`/service-areas`) · **Ask a question** (ghost) — same pattern on long-form pages that use the default footer.
- **`PublicShell`**: **desktop** primary **Book** in the header (`md+`); **mobile** fixed bottom bar (hidden on `/book`, `/login`, `/register`, `/auth/*`) — Book + Coverage with safe-area padding; main column **`pb-[4.75rem] md:pb-0`** when the bar is shown so content isn’t obscured.
- **`/services`**: uses default article footer; mid-page **Pricing calculator** only (avoids duplicating Book).
- **`/contact`**: Book + Check coverage row under contact details.
- **Custom footers** (`/how-it-works`, `/faq`, `/safety`): same **Book → Check coverage → contact** priority where applicable.

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
