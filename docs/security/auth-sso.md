# Authentication — Clerk + Laravel JWT verification

WeSharp ships **two layers**:

1. **Clerk** — identity for the SPA (Next.js) with hosted sign-in/register UI and JWT session tokens (`Authorization: Bearer …`).
2. **Laravel** — canonical authorisation mapping every request to `users.role`, permissions (`App\Support\Permissions`), policies, and tenant `company_id` scoping.

The browser **never decides** RBAC outcomes; it only adjusts navigation when `/api/v1/me` exposes permissions **for UX**. Every mutating endpoint must duplicate checks via middleware / policies.

---

## Frontend middleware (Next.js)

`apps/frontend/src/middleware.ts` uses `clerkMiddleware`: only **`/admin`, `/account`, `/auth`, `/venue-pending`, `/offline`** invoke **`await auth.protect()`** — marketing, **`/book`**, **`/login`**, **`/register`**, **`/unauthorised`**, **`/forbidden`**, and brochure routes stay public. The handler must **await** `protect()` so Clerk can return a redirect response to the framework (see Clerk Next.js middleware reference).

- Packages: **`@clerk/nextjs`** in `apps/frontend`.
- `ClerkProvider` wraps the shell in `src/app/providers.tsx`.
- Tenant vs staff segregation after sign-in still uses Laravel **`/api/v1/me`** in React (never trust client-only checks for RBAC).

---

## Laravel JWT verification

Implementation:

- **`App\Services\Clerk\ClerkJwtVerifier`** — downloads JWKS (cached ±15 min), verifies JWT signature/expiry (`firebase/php-jwt`), optional `iss`/`aud` guards from `config/clerk.php`.
- **`App\Services\Clerk\ClerkUserSynchronizer`** — links `jwt.sub` ⇄ `users.clerk_user_id`, falls back by email for legacy seeded rows without Clerk IDs yet, optionally calls Clerk’s REST **`GET https://api.clerk.com/v1/users/{sub}`** with `CLERK_SECRET_KEY` when email cannot be inferred from JWT claims alone.

JWT-only claims are **hints**; authoritative role/state lives in Postgres.

---

## Middleware

| Alias (`bootstrap/app.php`) | Purpose |
| --- | --- |
| `clerk.auth` | Validates Bearer JWT → syncs Laravel `User` (`App\Http\Middleware\AuthenticateClerkJwt`). |
| `staff` | Internal roles only (`App\Http\Middleware\EnsureInternalStaff`; optional `:super_admin\|finance` narrowing). |
| `tenant` | Customer roles (`customer_owner`, `customer_staff`) with enforced `company_id` (`EnsureTenantCustomer`). |
| `permission:{key}` | Asserts Laravel permission constants (`EnsurePermission`). |

PHPUnit only: forwarding header `config('clerk.testing_bypass_header')` (**default:** `X-WeSharp-Test-User-Id`) may resolve a seeded user id instead of validating JWT when `phpunit` detects `App::runningUnitTests()`.

---

## Environment variables — backend

| Variable | Meaning |
| --- | --- |
| `CLERK_SECRET_KEY` | Clerk secret used for REST lookups / future webhooks. |
| `CLERK_JWKS_URL` | JWKS discovery document (normally `…/.well-known/jwks.json`). |
| `CLERK_JWT_ISSUER` | Must match JWT `iss` claim (instance URL). |
| `CLERK_JWT_AUDIENCE` | Optional JWT audience/azp pinning. |
| `CLERK_API_BASE` | Defaults to Clerk cloud (`https://api.clerk.com/v1`). |
| `CLERK_DEFAULT_USER_ROLE` / `CLERK_DEFAULT_USER_STATUS` | Bootstrap values for freshly created DB rows awaiting manual promotion (`customer_staff`, `active` by default). |
| `FRONTEND_ORIGIN` | Narrow `config/cors.php` in hardened environments (currently `*` for dev ergonomics). |

---

## Environment variables — frontend (`apps/frontend/env.local.example`)

| Variable | Meaning |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Publishable PK from Clerk. |
| `NEXT_PUBLIC_API_ORIGIN` | Laravel base URL reachable from browsers (e.g., `http://localhost:8000`). |

---

## Known gaps / follow-ups

- **Clerk webhooks** — inbound `user.*` events are handled at **`POST /api/webhooks/clerk`** (Svix verification + idempotent `webhook_inbox`); role **authority** remains PostgreSQL (`users.role`). Syncing Laravel-only role changes back into Clerk metadata is deferred.
- **Multi-company impersonation UI** absent — placeholder `CompanySwitcher` documents future states.
- **Payment overrides**: `payments.override` is limited to **`super_admin`** / **`admin`** (not **Finance**); overpayment and posting on an already-**paid** invoice require it. Normal recording uses **`payments.manage`** and is audited.
