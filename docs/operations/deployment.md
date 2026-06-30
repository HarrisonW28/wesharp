# Deployment notes (WeSharp MVP)

Minimal guidance for standing up **frontend** + **API** environments. Tune for your infra (Vercel, Fly, Kubernetes, VPS).

**Environments, GitLab workflow, checklists and CI:** see **`docs/operations/gitlab-environments-and-deployment.md`** (Sprint 11.6).

**Staging branch, Plesk auto-deploy, GitHub Actions:** **`docs/operations/staging-plesk-deployment.md`**.

**Production deploy, backup, rollback, smoke tests, monitoring, launch gate:** **`docs/operations/production-deployment-readiness.md`** (Sprint 12.7).

**“Failed to fetch” / sign-in cannot reach Laravel:** **`docs/operations/production-api-troubleshooting.md`** — TLS cert on `api.*`, CORS, Vercel env.

---

## Environment variables

### Laravel (`apps/backend`)

Configure via `.env` / platform secret store:

| Variable | Purpose |
| --- | --- |
| **`APP_URL`**, **`APP_KEY`** | Canonical base URL & encryption |
| **Database** | `DB_*` connection Laravel expects |
| **`CLERK_*`** | Issuer, JWKS, optional local bypass (see **`config/clerk.php`**) |
| **`STRIPE_*`** | Keys + **`STRIPE_WEBHOOK_SECRET`** for **`POST /api/webhooks/stripe`** |
| **`CLERK_WEBHOOK_SIGNING_SECRET`** | Svix signing secret for **`POST /api/webhooks/clerk`** (see **`config/clerk.php`**) |
| **`CORS`** | Restrict origins beyond `*` in production (**`config/cors.php`**) |

### Next.js (`apps/frontend`)

| Variable | Purpose |
| --- | --- |
| **`NEXT_PUBLIC_API_ORIGIN`** | Laravel base **without** trailing slash — browser calls **`${ORIGIN}/api/...`** |
| **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`** | Clerk publishable key. **Production** must use **your** key. If omitted during **`next build`**, the codebase falls back to a structural **`pk_test_...`** placeholder so CI builds succeed — see **`env.local.example`**. |

---

## Build & migrate

### Backend

```bash
cd apps/backend
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan migrate --force
```

Do **not** run **`php artisan migrate --seed`** against production: **`DatabaseSeeder`** intentionally skips **`WeSharpDemoSeeder`** when **`APP_ENV=production`**. Use **`migrate --seed`** only in local/staging when demo fixtures are required.

Run **`php artisan test`** in CI before promote (see **`.gitlab-ci.yml`** on GitLab).

### Production checklist

| Item | Note |
| --- | --- |
| **`APP_ENV`** | **`production`** |
| **`APP_DEBUG`** | **`false`** (no stack traces in browser/API) |
| **`APP_KEY`** | Set (`php artisan key:generate` once per env) |
| **Database** | **`migrate --force`** only; no demo seed in prod |
| **Clerk / Stripe** | Production keys + webhook signing secrets |
| **CORS** | **`FRONTEND_ORIGIN`** or **`CORS_ALLOWED_ORIGINS`** — avoid wildcard in prod (`config/cors.php`) |
| **Smoke URLs** | **`GET /api/v1/admin/smoke`** and **`GET /api/v1/account/smoke`** are **not registered** in production — use **`GET /api/health`** and authenticated reads (e.g. **`/api/v1/me`**, **`/api/admin/analytics/overview`**) |
| **Storage** | **`php artisan storage:link`** if serving user uploads from `public` disk |

### Frontend

```bash
cd apps/frontend
npm ci
npx tsc --noEmit
npm run lint
npm run build
```

---

## Health checks

- **`GET ${API_ORIGIN}/api/health`** — should return **200** JSON from Laravel.

---

## Related documents

- **`docs/operations/production-deployment-readiness.md`** — step-by-step prod deploy, backups, rollback, post-deploy smoke, monitoring, launch checklist  
- **`docs/operations/gitlab-environments-and-deployment.md`** — staging/prod URLs, env reference, GitLab branches, deploy/rollback/smoke checklists, CI  
- **`docs/product/mvp-scope.md`** — feature list & known gaps  
- **`docs/testing/qa-checklist.md`** — pre-release checklist  
- **`docs/security/`** — auth, uploads, Stripe, permissions matrix  
