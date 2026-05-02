# GitLab, environments and deployment safety (Sprint 11.6)

Operational reference for **local**, **staging** and **production**. No secrets belong in git — store values in GitLab CI/CD variables, your host’s secret manager, or `.env` files kept out of version control.

---

## 1. Environment plan

| Tier | Purpose | Data | Clerk / payments | Typical audience |
| --- | --- | --- | --- | --- |
| **Local / dev** | Feature work, fast feedback | Developer DB (SQLite or local Postgres); optional seed data | Dev Clerk app or test keys; Stripe **test** mode | Engineers |
| **Staging** | Pre-production verification, demos | **Dedicated** staging DB (never a copy of prod with real PII unless redacted) | **Separate** Clerk app/instance from production; Stripe **test** mode | QA, product, trusted stakeholders |
| **Production** | Live customers | Production DB + backups | Production Clerk; Stripe **live** mode only after explicit go-live | Customers and staff |

**Rule:** Do not point staging at production Clerk, Stripe, or database credentials.

---

## 2. Recommended URLs

| Environment | Customer / marketing app (Next.js) | API (Laravel) |
| --- | --- | --- |
| **Production** | `https://app.wesharp.co.uk` | `https://api.wesharp.co.uk` |
| **Staging** | `https://staging.wesharp.co.uk` | `https://api-staging.wesharp.co.uk` |
| **Local** | `http://localhost:3000` (or similar) | `http://localhost:8000` (or similar) |

Tune hostnames to your DNS and TLS setup; keep **one canonical API origin per environment** and set `NEXT_PUBLIC_API_ORIGIN` / `APP_URL` / CORS accordingly.

---

## 3. Environment variables (by surface)

### 3.1 Laravel (`apps/backend` — see also `.env.example`)

| Area | Variables (representative) | Notes |
| --- | --- | --- |
| **Core** | `APP_ENV`, `APP_KEY`, `APP_URL`, `APP_DEBUG` | `APP_DEBUG=false` in staging/prod; unique `APP_KEY` per environment |
| **Database** | `DB_*` | Isolated DB per tier; staging must not use prod connection strings |
| **Clerk** | `CLERK_SECRET_KEY`, `CLERK_JWKS_URL`, `CLERK_JWT_ISSUER`, optional `CLERK_JWT_AUDIENCE`, `CLERK_API_BASE`, `CLERK_DEFAULT_*`, **`CLERK_WEBHOOK_SIGNING_SECRET`** | Must match the **same** Clerk application as the frontend for that tier |
| **Clerk webhooks** | Signing secret from Clerk → webhooks | Endpoint: `POST {API}/api/webhooks/clerk` |
| **CORS / browser** | `FRONTEND_ORIGIN`, optional `CORS_ALLOWED_ORIGINS` | Restrict to known SPA origins in non-local |
| **Mail** | `MAIL_*` | Use log/array driver in dev; real transport in staging only if safe |
| **Queue / cache / session** | `QUEUE_CONNECTION`, `CACHE_STORE`, `SESSION_DRIVER`, `REDIS_*` if used | Prefer Redis or DB in multi-instance staging/prod |
| **Filesystem** | `FILESYSTEM_DISK`, cloud disks if used | Private buckets for uploads |
| **Stripe** | `STRIPE_*`, **`STRIPE_WEBHOOK_SECRET`** | Test keys on local/staging; live keys **only** in production |
| **Customer links** | `FRONTEND_URL` | Invoice/notification links target the right app URL |

### 3.2 Next.js (`apps/frontend` — see `env.local.example`)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Must match the Clerk app for that environment |
| `NEXT_PUBLIC_API_ORIGIN` | Laravel base URL **without** trailing slash |

Server-only secrets for Next (if any) belong in the host’s env, not `NEXT_PUBLIC_*`.

### 3.3 Clerk separation (mandatory)

- Use **different** Clerk applications (or clearly separated instances) for **staging vs production**.
- Pair backend and frontend env vars per tier: same issuer/JWKS, publishable key, and secret key family.
- **Never** reuse production `CLERK_SECRET_KEY`, JWT issuer, or webhook signing secrets on staging.
- After creating a staging Clerk app, configure **staging-only** webhook URLs pointing at `api-staging…/api/webhooks/clerk` (and Stripe test webhooks similarly).

---

## 4. GitLab branch workflow

| Branch / pattern | Role |
| --- | --- |
| **`main`** | Production releases; deploy only from tagged or protected pipelines after checks pass |
| **`staging`** | Optional integration branch feeding the staging environment |
| **`develop`** | Ongoing integration; default target for feature work |
| **`feature/*`** | Short-lived branches; open MR into `develop` (or `staging` if your team gates that way) |
| **`hotfix/*`** | Emergency fixes branched from `main`; merge back via MR; tag release |

**Protect `main` (and optionally `staging`):** require MR approval, passing CI, and no direct pushes.

---

## 5. CI summary (`.gitlab-ci.yml`)

The repository includes a root **GitLab CI** pipeline that:

- **Backend:** installs Composer dependencies and runs `php artisan test` (SQLite in-memory per `phpunit.xml`).
- **Frontend:** runs `npm ci`, then `npm run typecheck` and `npm run lint` in one job.

Extend with deploy jobs, caching, and environment-scoped variables in GitLab as your infra matures. This file documents intent; **enable the runner** and **configure variables** in GitLab itself.

---

## 6. Deployment checklists

### 6.1 Staging deploy

- [ ] MR approved; **`develop`** / **`staging`** pipeline green (or release branch).
- [ ] Staging env vars set for **staging** Clerk, **test** Stripe, staging DB, `APP_URL` / `FRONTEND_URL` for staging hostnames.
- [ ] Run database migrations against **staging** DB (`php artisan migrate --force` or host equivalent).
- [ ] Clear/rebuild config cache if used (`php artisan config:cache` after deploy).
- [ ] Confirm `GET /api/health` on staging API returns 200.
- [ ] Smoke test staging (see §8).
- [ ] Verify Clerk sign-in and one authenticated API call from staging SPA.

### 6.2 Production deploy

- [ ] Tagged release or protected pipeline from **`main`**; CI green.
- [ ] **Production** secrets only in prod secret store; **no** test Stripe keys.
- [ ] Maintenance window communicated if needed.
- [ ] Database backup verified before migrate.
- [ ] Migrations applied; rollback SQL or downgrade plan noted if high-risk.
- [ ] Config/route caches refreshed as per runbook.
- [ ] `GET /api/health` OK; spot-check critical paths (login, one staff action, one customer path).
- [ ] Monitor logs and error tracking for first 30–60 minutes.

### 6.3 Rollback

- [ ] Stop or pause automated deploys.
- [ ] Revert to previous **container/image/release artifact** (or redeploy previous tag).
- [ ] If schema migrated: run **down** migrations only if safe and tested; otherwise restore DB from **pre-deploy backup** (preferred for risky releases).
- [ ] Invalidate caches if app version and cached config diverge.
- [ ] Confirm health check and one critical user journey.
- [ ] Post-incident: document cause; fix forward on `main` / `hotfix/*`.

---

## 7. Staging smoke test checklist

Quick pass after deploy or config change:

- [ ] **Public:** homepage loads; one service/marketing page loads.
- [ ] **Auth:** sign-in/sign-up (Clerk) completes; redirected app shell loads.
- [ ] **API:** `GET /api/health` = 200; authenticated `GET /api/v1/me` returns expected role/permissions.
- [ ] **Tenant:** open customer dashboard; list bookings or orders (empty state OK).
- [ ] **Staff:** open admin shell; one read-only list view loads (e.g. bookings or companies).
- [ ] **Webhooks (optional on staging):** Stripe/Clerk test deliveries or dashboard “replay” reaches staging URL without 5xx.

---

## 8. Related documents

- `docs/operations/deployment.md` — build/migrate commands and short env table  
- `docs/security/auth-sso.md` — Clerk + Laravel JWT behaviour  
- `docs/security/stripe-security.md` — Stripe handling  
- `docs/roadmap/sprint-11.md` — Sprint 11.6 acceptance context  

---

## 9. Remaining setup outside the repo

- Register DNS for production and staging hostnames; issue TLS certificates.
- Create **GitLab protected branches**, merge request settings, and **CI/CD variables** per environment.
- Provision databases, Redis, object storage, and worker processes as per scale.
- Configure **monitoring and log aggregation** for staging and production.
- Define **backup and restore** drills for production Postgres (and R2/S3 if used).
