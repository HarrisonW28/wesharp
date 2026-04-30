# Public website — booking enquiries

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
4. Automated: **`php artisan test tests/Feature/PublicBookingEnquiryApiTest.php`**.

## Known gaps

- Public flow does **not** create a Clerk user or portal login; qualification remains an ops step.
- **CORS**: browser submissions require Laravel to allow the marketing origin (`config/cors.php`); local same-origin proxies are fine.
- Extreme timezone edges around **`preferred_date`** may differ slightly between browser validation and Laravel’s **`after:yesterday`** rule; ops should reconcile on confirm.
