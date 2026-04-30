# Testing strategy — WeSharp MVP

We split checks into fast automated layers (CI-friendly) versus browser flows that depend on Clerk and third parties.

## Stack

| Layer | Location | Runs when |
| --- | --- | --- |
| **API / integration** | `apps/backend/tests` — PHPUnit (`php artisan test`) | Backend changes; SQLite in-memory per `phpunit.xml`. |
| **Unit / schema / lightweight UI** | `apps/frontend` — Vitest + Testing Library | Frontend logic, Zod schemas, presentational components. |
| **E2E smoke** | `apps/frontend/e2e` — Playwright (Chromium) | Before release / optional CI; spins up Next **unless** `PLAYWRIGHT_NO_WEBSERVER=1`. |
| **Auth‑gated UX** | Playwright placeholders + manual QA docs | Clerk sign-in fixtures not committed yet (`PLAYWRIGHT_RUN_CLERK_FLOWS`). |

## Backend conventions

- **Seeded happy paths:** Feature tests seed `WeSharpDemoSeeder` for realistic roles (**`operations@`** SuperAdmin, **`driver@`**, **`finance@`**, **`kitchen.portal@`** tenant).
- **Auth in tests:** `AuthenticateClerkJwt` honours header **`X-WeSharp-Test-User-Id`** when **`App::runningUnitTests()`**, so Laravel tests do **not** need real JWTs.
- **Isolation:** Prefer `RefreshDatabase`; security tests may use factories only.

## Frontend conventions

- **Vitest:** `vitest.config.ts` aliases **`@`** to `src`; `*.test.ts(x)` beside or under touched modules.
- **Playwright:** `playwright.config.ts` defaults **`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000`**. Parallel Clerk flows remain documented in **`e2e-critical-flows.md`**.

## What runs in CI (recommended minimum)

```bash
cd apps/backend && php artisan test
cd apps/frontend && npm run test
cd apps/frontend && PLAYWRIGHT_NO_WEBSERVER=1 npx playwright test   # optional: omit when UI server not CI-provided
```

Add **`PLAYWRIGHT_API_ORIGIN`** to CI when Laravel is reachable, so the `/api/health` Playwright check runs instead of skips.
