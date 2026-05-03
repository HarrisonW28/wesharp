# Public website — booking enquiries & area check

## Service area check and waitlist

Visitors can check whether a postcode falls inside an active **`service_areas`** row (longest **`postcode_prefix`** match) and, if not covered, join a waitlist.

| Item | Detail |
| --- | --- |
| Check | **`POST /api/public/service-area/check`** — body `{ "postcode": "…" }`; **`200`** returns **`data.covered`**, optional **`data.area`** (`id`, `label`, `city`), and **`data.next_collection_date`** (next future non-completed route date, or **`null`**) when covered. |
| Waitlist | **`POST /api/public/service-area/waitlist`** — **`name`**, **`email`**, **`postcode`**, **`customer_type`** (`home` \| `business` \| `other`), optional **`estimated_knife_count`**, optional **`notes`**, optional **`source`** (`service_areas_page` \| `booking_wizard`; default **`service_areas_page`**), required **`contact_consent`** (must be true); **`422`** with code **`in_service_area`** if the postcode is already covered. **`201`** returns **`data.accepted`** + **`message`** only (no row UUID). |
| Rate limit | **`throttle:service-area-public`** — **20 requests per minute per IP** (`RateLimiter::for('service-area-public')`). |
| Audit | **`AuditRecorder::record(null, signup, 'public.service_area_waitlist_signup', …)`**. |
| Marketing UI | **`/service-areas`** — `ServiceAreaCheckerSection` (see `apps/frontend/src/components/marketing/ServiceAreaCheckerSection.tsx`). |
| Admin | **`GET /api/admin/service-area-waitlist`** — **`companies.view`**; paginated **`data.items`**. Next.js **`/admin/waitlist`**. |

## Public pricing calculator (Sprint 14.2)

| Item | Detail |
| --- | --- |
| Endpoint | **`POST /api/public/pricing-estimate`** — **`knife_count`**, **`programme_mode`** (`pay_as_you_go` \| `subscription`), **`service_type`** (`collection` \| `onsite`), **`visit_pattern`** (`single` \| `regular`), **`customer_kind`** (`home` \| `business`), optional **`postcode`**. |
| Pay-as-you-go | Resolves the same active **`pricing_rules`** rows as workshop pricing (by **service type** + **postcode / service area prefix**). Supports **`per_knife`** (incl. **`minimum_units`** in **`constraints`**) and **`flat_visit`**. |
| Subscription | Picks the smallest **`included_knife_allowance`** that still covers **`knife_count`** (else the largest allowance plan), adds **overage** from **`overage_price_amount_minor`** when needed. Plans limited to **`show_on_public_site`** + **`is_active`** (same idea as **`GET /api/public/site-content`**). |
| Rate limit | **`throttle:pricing-estimate-public`** — **30/min/IP**. |
| Marketing UI | **`/pricing`** — `PublicPricingCalculator`; **Book a collection** links into **`/book`** with query hints (`knives`, `postcode`, `programme`, `service`). |

## Public subscription cards (Sprint 14.2b)

| Item | Detail |
| --- | --- |
| Endpoint | **`GET /api/public/subscription-plans`** — **`200`** with **`data.items`**: marketed plans (**`is_active`**, **`show_on_public_site`**, not soft-deleted), ordered **`recommended` DESC**, then **`sort_order`**, **`name`**. Same rows as **`public_subscription_plans`** on **`GET /api/public/site-content`**. |
| Rate limit | **`throttle:site-content-public`** (same bucket as site-content). |
| Marketing UI | **`PublicSubscriptionPlansCatalog`** on **`/`**, **`/pricing`**, **`/subscriptions`** — fetches the endpoint client-side (loading / empty / error); always includes a **Custom / bespoke** card; plan CTAs link to **`/book`** with **`plan_name`**; bespoke uses **`custom_plan=1`**. |

---

## Booking enquiries (existing)

Marketing visitors can submit a **booking enquiry** without signing in. The Next.js route **`/book`** posts JSON to Laravel **`POST /api/public/booking-enquiries`**.

## API

| Item | Detail |
| --- | --- |
| Endpoint | **`POST /api/public/booking-enquiries`** (`api.public.booking_enquiries.store`) |
| Auth | None (public); responses follow standard **`ApiResponses`** JSON (no stack traces in API mode). |
| Rate limit | **`throttle:booking-enquiries`** — **10 requests per minute per IP** (`AppServiceProvider::boot`, `RateLimiter::for('booking-enquiries')`). |
| Validation | `App\Http\Requests\Public\StorePublicBookingEnquiryRequest` — business/contact details, full UK-style address, optional knife count, **`preferred_date`** (not in the past), **`time_window_preference`**, **`service_type`** (`collection` \| `onsite`), **`message`**, **`terms_accepted`** (must be accepted). |
| Success **201** | `{ "success": true, "data": { "accepted": true, "message": "…" } }` — intentionally **no internal UUIDs** in the body. |
| Failure **422** | `ApiResponses::validationError` — `error.errors` keyed by field. |

## Server-side behaviour

Handled by **`CreatePublicBookingEnquiryAction`**:

1. **Company** — match existing by normalised **`billing_email`** or a **contact** email; otherwise create **`CompanyStatus::Lead`** with the submitted business name and email.
2. **Location** — create a **`CompanyLocation`** from the submitted address (label includes the preferred date).
3. **Contact** — **`updateOrCreate`** on company + normalised email; name split into first/last.
4. **Booking** — **`BookingStatus::Requested`**, **`scheduled_date`** from **`preferred_date`**, customer notes combine message, time window, optional knife count, and a **`[Source: wesharp.app public booking form]`** tag; internal notes flag anonymous public capture.
5. **CRM note** — morph **note** on the company (no author) for ops visibility.
6. **Audit** — **`AuditRecorder::record(null, …)`** on company (`public.booking_enquiry`) and booking (`booking.created_from_public_enquiry`); **actor** is null for these events.

## Frontend

- **Route:** `apps/frontend/src/app/(public)/book/page.tsx`
- **Client validation:** `apps/frontend/src/lib/public-booking-schema.ts` (Zod, aligned with Laravel rules).
- **API base:** `NEXT_PUBLIC_API_ORIGIN` (see `apps/frontend/src/lib/env.ts`); the form is disabled when unset and shows configuration guidance.
- **Home CTA:** “Request a pickup” on the marketing hero links to **`/book`**.

## How to test (manual)

1. Set **`NEXT_PUBLIC_API_ORIGIN`** (e.g. `http://127.0.0.1:8000`) and run Laravel + Next dev servers.
2. Open **`http://localhost:3000/book`**, fill the form, tick terms, submit — expect success screen with next steps copy.
3. In admin CRM, locate the **lead** company and **requested** booking created from the enquiry.
4. On **`/service-areas`**, run postcode check (covered vs not); submit waitlist only when not covered; confirm row in **`/admin/waitlist`**.
5. Automated: **`php artisan test tests/Feature/ServiceAreaPublicApiTest.php`**, **`tests/Feature/PublicBookingEnquiryApiTest.php`**.

## Known gaps

- Public flow does **not** create a Clerk user or portal login; qualification remains an ops step.
- **CORS**: browser submissions require Laravel to allow the marketing origin (`config/cors.php`); local same-origin proxies are fine.
- Extreme timezone edges around **`preferred_date`** may differ slightly between browser validation and Laravel’s **`after:yesterday`** rule; ops should reconcile on confirm.
