# Sprint 18.1 — Public website IA and content audit

**Date:** 2026-05-01  
**Scope:** Read-only review of `apps/frontend/src/app/(public)` routes, `PublicShell` navigation (`PUBLIC_SITE_NAV_LINKS`), homepage composition, and CMS-driven copy (`fetchPublicSiteContent` / content settings).  
**Goal:** Make the public structure explicit, map it to Sprint 18’s suggested IA, flag weak or missing pages, note duplicate copy risks, and state a clear default customer journey — without building new pages (18.2+).

---

## 1. Executive summary

The public site already covers most of the suggested IA: **home**, **how it works**, **services**, **pricing**, **programmes/subscriptions**, **service areas** (with live checker), **commercial/trade** positioning, **FAQ**, **contact**, **safety**, and **book**. Primary nav is a **single source of truth** in `apps/frontend/src/config/public-site-nav.ts`.

The largest gaps vs the sprint bullet list are: **no dedicated “About / trust” page** (trust is fragmented across homepage hero badges, benefits, `/safety`, and FAQs), and **no page titled “Commercial sharpening”** as such — that intent is split between **`/trade-accounts`**, **`/services`** (on-site paragraph), and **`/subscriptions`**.

**Footer** links are a **partial subset** of the header (omits Services, FAQ, Safety, For business) and use the label **“Coverage”** while the header uses **“Areas we cover”** — minor inconsistency.

---

## 2. Route inventory (`app/(public)`)

| Path | Role |
| ---- | ---- |
| `/` | Homepage: hero (`HomeHero`), how-it-works teaser, audiences, benefits, areas teaser, pricing teaser, final CTA band |
| `/services` | Service description: collection, on-site option, post-book CTAs (CMS title/lead + hardcoded sections) |
| `/pricing` | Calculator + programme catalogue; links to subscriptions & trade |
| `/subscriptions` | Programme explanation + `PublicSubscriptionPlansCatalog` |
| `/how-it-works` | Ordered steps from CMS |
| `/service-areas` | Static area chips + `ServiceAreaCheckerSection` (API-backed) |
| `/trade-accounts` | B2B / multi-site positioning (hardcoded article) |
| `/faq` | FAQ list from CMS (`site.faq`) |
| `/contact` | Email/phone from CMS + book CTA |
| `/safety` | Safety & compliance (hardcoded; includes internal-adjacent “MVP” phrasing — see §5) |
| `/book` | Public booking wizard |
| `/track/[token]` | Order tracking (utility; not central to marketing IA) |
| `/login`, `/register` | Clerk auth (adjacent to marketing funnel) |

**Book** is **not** in `PUBLIC_SITE_NAV_LINKS`; conversion relies on **hero/homepage CTAs**, **`MarketingArticle` footer CTAs**, **mobile sheet primary button**, and deep links from `/service-areas` after a check.

---

## 3. Primary navigation

Configured in `PUBLIC_SITE_NAV_LINKS` (order as shipped):

1. Services  
2. For business → `/trade-accounts`  
3. Subscriptions  
4. How it works  
5. Areas we cover  
6. Pricing  
7. FAQ  
8. Contact  
9. Safety  

Desktop header exposes all; **Book a collection** is prominent on **mobile sheet** only (not in the desktop header row).

---

## 4. Mapping to Sprint 18 suggested pages

| Suggested (sprint doc) | Current reality | Notes |
| ---------------------- | --------------- | ----- |
| Home | `/` | Strong hub; multiple onward paths |
| How it works | `/how-it-works` + `#how-it-works` on home | Intentional teaser vs full page |
| Services | `/services` | |
| Pricing/packages | `/pricing` + `/subscriptions` | Split is logical; cross-links present |
| Service areas | `/service-areas` | Checker is differentiator |
| Commercial sharpening | **Distributed** | `/trade-accounts`, `/services` (on-site), programmes |
| FAQs | `/faq` | |
| About/Trust | **No `/about`** | Trust signals on home + `/safety` + FAQ |
| Contact | `/contact` | |
| Book now | `/book` | Conversion entry; not in main desktop nav |

---

## 5. Duplicate or confusing copy (risks)

1. **Process story** appears on **homepage** (four steps from CMS), **`/how-it-works`** (longer list), and **`/services`** (bullet list: logging, workshop, return). Wording is similar; a skim can feel repetitive. *Mitigation (later):* one canonical “story” in CMS with shorter teasers elsewhere, or clearer “overview vs detail” labels.

2. **B2B value** overlaps among **`/trade-accounts`**, **`/subscriptions`**, and homepage **“who for”** chips — acceptable if each page has a distinct job (account vs programme vs segment labels).

3. **`/safety`** mixes customer reassurance with **internal product language** (“MVP focuses on coherent digital custody”). For a premium public site, this reads less “trust” and more “backlog”. *Recommendation:* customer-facing rewrite in 18.4 or content settings.

4. **Area labels:** homepage and `/service-areas` show **`SERVICE_AREAS`** static config; the **checker** is API-authoritative. Audit Sprint 17 already noted drift risk between static chips and DB — keep checker result copy primary.

5. **Footer vs header:** “Coverage” vs “Areas we cover”; fewer links in footer — may hide **Services** or **FAQ** for users who scroll to the bottom only.

---

## 6. Clear customer journey (recommended defaults)

**Primary kitchen / B2B path**

1. Land **`/`** or **`/services`** → understand offer.  
2. Confirm geography **`/service-areas`** (optional but encouraged before book).  
3. Understand money **`/pricing`** or **`/subscriptions`** (programme customers).  
4. **`/book`** enquiry (or **`/contact`** for pre-sales).  
5. **`/register`** when ready for portal / ongoing relationship.

**Trade / multi-site path**

- **`/trade-accounts`** → **`/book`** or **`/contact`**, with **`/subscriptions`** for programme detail.

**Objection-handling path**

- **`/how-it-works`**, **`/faq`**, **`/safety`** (after copy tidy), **`/contact`**.

**Gap:** visitors seeking **“why WeSharp” / team / credentials** have no single **About** page; they must infer from home + FAQ. *18.2–18.4:* add lightweight About/Trust or strengthen FAQ + home.

---

## 7. Content system notes

Many titles/leads and homepage sections come from **public site content** (API-backed defaults in `site-content-defaults`).  
**Hardcoded** bodies: `services`, `trade-accounts`, `subscriptions` (partial), `safety`, parts of `pricing` layout.

*Implication:* IA can be stable while 18.3+ moves prose into content settings where editors need control.

---

## 8. Acceptance checklist (18.1)

- [x] Public website structure is documented and navigable from code.  
- [x] Missing or weak pages called out (About/trust, commercial sharpening naming).  
- [x] Duplicate / confusing copy areas identified.  
- [x] Clear default customer journeys documented.  

---

## 9. References

| Item | Location |
| ---- | -------- |
| Nav | `apps/frontend/src/config/public-site-nav.ts` |
| Shell / footer | `apps/frontend/src/components/layout/PublicShell.tsx` |
| Homepage | `apps/frontend/src/app/(public)/page.tsx`, `HomeHero.tsx` |
| Marketing template | `apps/frontend/src/components/marketing/MarketingArticle.tsx` |
| Static area chips | `apps/frontend/src/config/service-areas.ts` |
